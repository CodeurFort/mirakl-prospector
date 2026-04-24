#!/usr/bin/env python3
"""
fast_patterns.py — Generate likely emails for every seller with a contact_name
but no contact_email, verify the domain has a working MX record, then write
the best-guess email to Supabase with a moderate confidence score.

Strategy:
  1. For every seller with contact_name + company_domain + no contact_email
  2. Build the canonical pattern `{first}.{last}@{domain}` (plus a couple of
     alternates the user can try if the primary bounces)
  3. Resolve the MX for the domain (cached per domain — at most ~300 DNS calls
     even for a 5k seller catalogue)
  4. If MX resolves → save the primary pattern with confidence 45
     If MX fails → save nothing (the domain is dead)
  5. Parallelised with a ThreadPool (10 workers on DNS lookups).

This is deliberately NOT an SMTP verifier: Gmail / Outlook / ProtonMail accept
every RCPT TO, so probing is a waste of time. The user validates manually via
the email editor before sending.

Usage:
    python fast_patterns.py [--dry-run] [--limit N]
"""
import argparse
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import dns.resolver
from dotenv import load_dotenv

load_dotenv()


def clean_domain(raw: str) -> str:
    if not raw:
        return ""
    d = raw.strip().lower()
    for prefix in ("https://www.", "http://www.", "https://", "http://", "www."):
        if d.startswith(prefix):
            d = d[len(prefix):]
            break
    return d.rstrip("/").split("/")[0]


def strip_accents(s: str) -> str:
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def slug(s: str) -> str:
    s = strip_accents((s or "").strip().lower())
    return re.sub(r"[^a-z]", "", s)


def pick_patterns(first: str, last: str, domain: str) -> list:
    """Return the canonical pattern first, then 2 alternates — in priority order."""
    f, l = slug(first), slug(last)
    if not f or not domain:
        return []
    if not l:
        return [f"{f}@{domain}"]
    return [
        f"{f}.{l}@{domain}",           # primary (most common)
        f"{f[0]}{l}@{domain}",         # flast (Anglo tech companies)
        f"{f}{l}@{domain}",            # firstlast (concatenated)
    ]


MX_CACHE: dict = {}


def has_mx(domain: str) -> bool:
    if domain in MX_CACHE:
        return MX_CACHE[domain]
    try:
        dns.resolver.resolve(domain, "MX", lifetime=5)
        MX_CACHE[domain] = True
    except Exception:
        MX_CACHE[domain] = False
    return MX_CACHE[domain]


def worker(seller: dict) -> tuple:
    """Return (seller_id, seller_name, primary_email or '', reason)."""
    name = (seller.get("contact_name") or "").strip().split()
    domain = clean_domain(seller.get("company_domain") or "")
    if not domain or not name:
        return (seller["id"], seller["seller_name"], "", "no_name_or_domain")

    first = name[0]
    last = name[-1] if len(name) >= 2 else ""
    patterns = pick_patterns(first, last, domain)
    if not patterns:
        return (seller["id"], seller["seller_name"], "", "no_pattern")

    if not has_mx(domain):
        return (seller["id"], seller["seller_name"], "", "no_mx")

    # Primary pattern (first in the priority list)
    return (seller["id"], seller["seller_name"], patterns[0], "mx_ok")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--confidence", type=int, default=45,
                        help="Confidence score written to Supabase (default 45)")
    parser.add_argument("--workers", type=int, default=10)
    args = parser.parse_args()

    from supabase import create_client
    client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

    r = client.table("sellers").select(
        "id, seller_name, company_domain, contact_name"
    ).not_.is_("contact_name", "null").is_("contact_email", "null").execute()
    sellers = r.data or []
    if args.limit:
        sellers = sellers[:args.limit]

    print(f"\n{len(sellers)} sellers avec nom mais sans email\n", flush=True)

    found = 0
    skipped_nomx = 0
    skipped_other = 0
    now = datetime.now(timezone.utc).isoformat()

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(worker, s): s for s in sellers}
        for i, fut in enumerate(as_completed(futures), start=1):
            seller_id, seller_name, email, reason = fut.result()
            if email:
                if not args.dry_run:
                    client.table("sellers").update({
                        "contact_email": email,
                        "contact_confidence": args.confidence,
                        "enriched_at": now,
                    }).eq("id", seller_id).execute()
                found += 1
                if i % 20 == 0 or found <= 5:
                    print(f"  [{i}/{len(sellers)}] + {seller_name[:30]:30} -> {email}", flush=True)
            else:
                if reason == "no_mx":
                    skipped_nomx += 1
                else:
                    skipped_other += 1

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Termine:")
    print(f"  {found} emails ecrits (pattern canonique, conf={args.confidence}%)")
    print(f"  {skipped_nomx} sellers skip (domaine sans MX)")
    print(f"  {skipped_other} sellers skip (nom/domain manquants)")


if __name__ == "__main__":
    main()
