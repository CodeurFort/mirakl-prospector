#!/usr/bin/env python3
"""
enrich_hybrid.py — Hybrid contact enrichment: Better Contact for top sellers,
pattern-matching + MX/SMTP probe for the rest.

Split the cost: only spend Better Contact credits on HOT/HIGH priority sellers
(match_score >= 72). For the rest, generate canonical email patterns from the
contact_name + company_domain and verify them via MX + SMTP RCPT probe.

Usage:
    python enrich_hybrid.py [--dry-run] [--limit N] [--bc-threshold 72]

Requires: contact_name already populated (run find_contacts.py first).
"""
import argparse
import os
import re
import smtplib
import socket
import sys
import time
import unicodedata
from datetime import datetime, timezone

import dns.resolver
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BC_KEY = os.getenv("BETTERCONTACT_API_KEY", "")
BC_KEY_FALLBACK = os.getenv("BETTERCONTACT_API_KEY_FALLBACK", "")
BC_BASE = "https://app.bettercontact.rocks/api/v2"


def _bc_keys() -> list:
    return [k for k in [BC_KEY, BC_KEY_FALLBACK] if k]


def _looks_like_credit_error(status: int, body: dict) -> bool:
    if status in (401, 402, 403):
        return True
    text = str(body).lower()
    return any(w in text for w in ("credit", "insufficient", "quota", "unauthorized", "invalid api key"))
BATCH_SIZE = 80
SMTP_TIMEOUT = 6  # seconds
PROBE_FROM = "noreply@example.com"


# ── Domain cleaning ────────────────────────────────────────────────────────

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


# ── Pattern generation ─────────────────────────────────────────────────────

COMMON_PATTERNS = [
    "{first}.{last}",
    "{first}{last}",
    "{f}{last}",
    "{first}_{last}",
    "{first}",
    "{f}.{last}",
    "{last}.{first}",
]

# Priority order for generic mailboxes — tried after the named patterns fail.
# French brands favor "contact@" / "bonjour@"; English brands favor "hello@".
GENERIC_FR = ["contact", "bonjour", "info", "hello", "commercial", "presse"]
GENERIC_EN = ["contact", "hello", "info", "sales", "press", "partnerships"]


def generate_patterns(first: str, last: str, domain: str) -> list:
    first = strip_accents((first or "").strip().lower())
    last = strip_accents((last or "").strip().lower())
    first = re.sub(r"[^a-z]", "", first)
    last = re.sub(r"[^a-z]", "", last)
    if not domain:
        return []
    if not first:
        return []

    patterns = []
    seen = set()
    for pat in COMMON_PATTERNS:
        if ("{last}" in pat or "{l}" in pat) and not last:
            continue
        candidate = pat.format(
            first=first, last=last,
            f=first[0] if first else "",
            l=last[0] if last else "",
        )
        email = f"{candidate}@{domain}"
        if email not in seen:
            seen.add(email)
            patterns.append(email)
    return patterns


def generic_patterns(domain: str, country: str) -> list:
    aliases = GENERIC_FR if country in ("FR", "BE", "CH") else GENERIC_EN
    return [f"{a}@{domain}" for a in aliases]


# ── MX + SMTP probe ────────────────────────────────────────────────────────

MX_CACHE: dict = {}


def resolve_mx(domain: str) -> str:
    if domain in MX_CACHE:
        return MX_CACHE[domain]
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=5)
        sorted_mx = sorted(answers, key=lambda r: r.preference)
        mx = str(sorted_mx[0].exchange).rstrip(".")
        MX_CACHE[domain] = mx
        return mx
    except Exception:
        MX_CACHE[domain] = ""
        return ""


def smtp_probe(email: str, mx: str) -> str:
    """Return 'valid', 'unknown' (catch-all or unclear), or 'invalid'."""
    try:
        with smtplib.SMTP(mx, 25, timeout=SMTP_TIMEOUT) as server:
            server.helo("example.com")
            server.mail(PROBE_FROM)
            code, _ = server.rcpt(email)
            if code == 250:
                # Try a known-bogus address to detect catch-all
                bogus = f"z9y8x7w6v5u4@{email.split('@')[1]}"
                code2, _ = server.rcpt(bogus)
                if code2 == 250:
                    return "catch_all"
                return "valid"
            if code == 550:
                return "invalid"
            return "unknown"
    except (socket.timeout, socket.gaierror, smtplib.SMTPException, OSError):
        return "unknown"


def verify_patterns(patterns: list) -> tuple:
    """Return (email, status) for the first pattern that verifies, or ('', 'unknown')."""
    if not patterns:
        return "", "unknown"
    domain = patterns[0].split("@")[1]
    mx = resolve_mx(domain)
    if not mx:
        return "", "no_mx"

    for email in patterns:
        status = smtp_probe(email, mx)
        if status == "valid":
            return email, "valid_smtp"
        if status == "catch_all":
            # Catch-all means all addresses accept, low confidence
            return email, "catch_all"
        # invalid / unknown → try next
    return "", "not_found"


# ── Better Contact (unchanged logic, reused from bettercontact_batch) ──────

# task_id → key that submitted it, so polling uses the same key
_TASK_KEY: dict = {}


def bc_submit(contacts: list) -> str:
    """Submit a BC batch. Falls back to secondary key on credits/auth errors."""
    from curl_cffi import requests as cf
    keys = _bc_keys()
    for i, key in enumerate(keys):
        r = cf.post(
            f"{BC_BASE}/async",
            json={"data": contacts, "enrich_email_address": True, "enrich_phone_number": False},
            headers={"X-API-Key": key},
            impersonate="chrome120",
            timeout=15,
        )
        try:
            d = r.json()
        except Exception:
            d = {}
        task_id = d.get("id", "")
        if task_id:
            _TASK_KEY[task_id] = key
            return task_id
        if _looks_like_credit_error(r.status_code, d) and i < len(keys) - 1:
            print(f"  BC primary key failed ({r.status_code}), switching to fallback...", flush=True)
            continue
        return ""
    return ""


IN_PROGRESS_STATUSES = {"in progress", "pending", "processing", "on hold", "queued"}


def bc_poll(task_id: str, max_minutes: int = 45) -> list:
    from curl_cffi import requests as cf
    key = _TASK_KEY.get(task_id) or (_bc_keys()[0] if _bc_keys() else "")
    for i in range(max_minutes * 2):
        time.sleep(30)
        r = cf.get(
            f"{BC_BASE}/async/{task_id}",
            headers={"X-API-Key": key},
            impersonate="chrome120",
            timeout=15,
        )
        d = r.json()
        status = d.get("status", "")
        if i % 4 == 0:
            print(f"    [{task_id[:12]}... {i*30}s] {status} credits={d.get('credits_left','?')}", flush=True)
        if status == "terminated":
            _TASK_KEY.pop(task_id, None)
            return d.get("data", [])
        if status and status not in IN_PROGRESS_STATUSES:
            print(f"    [{task_id[:12]}...] unexpected terminal status: {status}", flush=True)
            _TASK_KEY.pop(task_id, None)
            return []
    return []


# ── Main orchestrator ──────────────────────────────────────────────────────

CONFIDENCE = {
    "valid": 95,
    "catch_all_safe": 75,
    "catch_all_not_safe": 55,
    "valid_smtp": 80,
    "catch_all": 45,
    "undeliverable": 30,
    "not_found": 0,
    "no_mx": 0,
    "unknown": 20,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--bc-threshold", type=int, default=72,
                        help="Min match_score to use Better Contact (default 72)")
    args = parser.parse_args()

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Sellers with contact_name but no email yet.
    # We also pull contact_linkedin and contact_job_title because Better Contact
    # returns much better results when those fields are included in the payload
    # (it scrapes the LinkedIn profile directly instead of guessing patterns).
    r = client.table("sellers").select(
        "id, seller_name, company_domain, contact_name, contact_linkedin, "
        "contact_job_title, match_score, country:ref_countries(code)"
    ).not_.is_("contact_name", "null").is_("contact_email", "null").execute()

    sellers = r.data or []
    if args.limit:
        sellers = sellers[:args.limit]
    print(f"\n{len(sellers)} sellers avec nom mais sans email\n", flush=True)

    # Split by score
    top = [s for s in sellers if (s.get("match_score") or 0) >= args.bc_threshold]
    rest = [s for s in sellers if (s.get("match_score") or 0) < args.bc_threshold]
    print(f"  - Better Contact (score >= {args.bc_threshold}): {len(top)}", flush=True)
    print(f"  - Pattern + MX/SMTP (score < {args.bc_threshold}): {len(rest)}\n", flush=True)

    # ── Path A: Better Contact for top sellers ────────────────────────────
    found_bc = 0
    if top and BC_KEY:
        contacts = []
        id_map = {}
        for i, s in enumerate(top):
            name = (s.get("contact_name") or "").strip().split()
            domain = clean_domain(s.get("company_domain") or "")
            if not domain or not name:
                continue
            # Feed BC every signal we have — LinkedIn URL boosts match rate massively
            contact = {
                "company_domain": domain,
                "company_name": s.get("seller_name") or "",
                "first_name": name[0],
            }
            if len(name) >= 2:
                contact["last_name"] = name[-1]
            if s.get("contact_linkedin"):
                contact["linkedin_url"] = s["contact_linkedin"]
            if s.get("contact_job_title"):
                contact["job_title"] = s["contact_job_title"]
            id_map[len(contacts)] = s["id"]
            contacts.append(contact)

        if contacts and not args.dry_run:
            # Submit in batches
            tasks = []
            for i in range(0, len(contacts), BATCH_SIZE):
                batch = contacts[i:i + BATCH_SIZE]
                task_id = bc_submit(batch)
                if task_id:
                    tasks.append((task_id, i))
                    print(f"  BC batch {len(tasks)}: {len(batch)} contacts → task {task_id}", flush=True)
                time.sleep(2)

            # Poll and update
            for task_id, start_idx in tasks:
                print(f"\n  Polling {task_id}...", flush=True)
                data = bc_poll(task_id)
                for j, bc in enumerate(data):
                    seller_id = id_map.get(start_idx + j)
                    if not seller_id:
                        continue
                    email = bc.get("contact_email_address")
                    if not email:
                        continue
                    status = bc.get("contact_email_address_status", "")
                    confidence = CONFIDENCE.get(status, 40)
                    update = {
                        "contact_email": email,
                        "contact_confidence": confidence,
                        "enriched_at": datetime.now(timezone.utc).isoformat(),
                    }
                    if bc.get("contact_job_title"):
                        update["contact_job_title"] = bc["contact_job_title"]
                    if bc.get("contact_linkedin_profile_url"):
                        update["contact_linkedin"] = bc["contact_linkedin_profile_url"]
                    client.table("sellers").update(update).eq("id", seller_id).execute()
                    found_bc += 1
                    print(f"    ✓ BC: {email} ({status}, {confidence}%)", flush=True)

    # ── Path B: Pattern + MX for the rest ─────────────────────────────────
    found_pattern = 0
    for s in rest:
        name = (s.get("contact_name") or "").strip().split()
        domain = clean_domain(s.get("company_domain") or "")
        if not domain or not name:
            continue

        first = name[0]
        last = name[-1] if len(name) >= 2 else ""
        country = (s.get("country") or {}).get("code") or ""

        patterns = generate_patterns(first, last, domain)
        email, status = verify_patterns(patterns)

        # Fallback to generics if named patterns fail
        if not email:
            generics = generic_patterns(domain, country)
            email, status = verify_patterns(generics)

        if email:
            confidence = CONFIDENCE.get(status, 20)
            print(f"  ✓ pattern: {s['seller_name']} → {email} ({status}, {confidence}%)", flush=True)
            if not args.dry_run:
                client.table("sellers").update({
                    "contact_email": email,
                    "contact_confidence": confidence,
                    "enriched_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", s["id"]).execute()
            found_pattern += 1
        else:
            print(f"  — pattern: {s['seller_name']} ({status})", flush=True)

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Terminé :")
    print(f"  BC : {found_bc}/{len(top)}")
    print(f"  Pattern : {found_pattern}/{len(rest)}")
    print(f"  Total enrichi : {found_bc + found_pattern}/{len(sellers)}")


if __name__ == "__main__":
    main()
