#!/usr/bin/env python3
"""
bettercontact_batch.py — Enrichit tous les sellers sans email.

Pipeline :
  1. Phase DDG  : cherche les noms de contact via DuckDuckGo (5 workers en parallèle)
  2. Phase BC   : soumet en lots de 80 à Better Contact avec nom+domaine
  3. Upsert Supabase

Usage:
    python bettercontact_batch.py [--dry-run] [--skip-ddg] [--limit N]
"""
import sys
import json
import time
import argparse
import os
import re
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BC_KEY = os.getenv("BETTERCONTACT_API_KEY", "")
BC_KEY_FALLBACK = os.getenv("BETTERCONTACT_API_KEY_FALLBACK", "")
BC_BASE = "https://app.bettercontact.rocks/api/v2"
BATCH_SIZE = 80
DDG_WORKERS = 5


def _bc_keys() -> list:
    return [k for k in [BC_KEY, BC_KEY_FALLBACK] if k]


def _looks_like_credit_error(status: int, body: dict) -> bool:
    if status in (401, 402, 403):
        return True
    text = str(body).lower()
    return any(w in text for w in ("credit", "insufficient", "quota", "unauthorized", "invalid api key"))


# task_id → key that submitted it, so polling uses the same key
_TASK_KEY: dict = {}

TARGET_TITLES = [
    "CEO", "Founder", "Co-Founder", "Head of Partnerships", "Head of Sales",
    "Head of E-commerce", "E-commerce Director", "CMO", "Marketplace Manager",
    "Business Development", "Chief Commercial", "VP Sales", "VP E-commerce",
    "Fondateur", "Fondatrice", "Directeur Commercial", "Directeur E-commerce",
    "Responsable Partenariats", "Directeur Général",
]


def clean_domain(raw: str) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    for prefix in ("https://www.", "http://www.", "https://", "http://", "www."):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
            break
    return raw.rstrip("/").split("/")[0]


# ── Phase 1 : DDG ─────────────────────────────────────────────────────────────

def ddg_find_contact(seller_name: str, domain: str) -> dict:
    try:
        from curl_cffi import requests as cf
    except ImportError:
        return {}

    queries = [
        f"{seller_name} fondateur CEO founder linkedin",
        f"{seller_name} directeur e-commerce marketplace linkedin",
    ]

    for query in queries:
        try:
            r = cf.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                impersonate="chrome120",
                timeout=12,
            )
            links = re.findall(
                r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?'
                r'class="result__snippet"[^>]*>(.*?)</(?:a|td)',
                r.text, re.DOTALL,
            )
            brand_lower = seller_name.lower()
            for raw_url, raw_title, raw_snippet in links[:8]:
                from urllib.parse import unquote
                url_match = re.search(r"uddg=([^&]+)", raw_url)
                url = unquote(url_match.group(1)) if url_match else raw_url
                title = re.sub(r"<[^>]+>", "", raw_title).strip()
                snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
                combined = f"{title} {snippet}".lower()

                if "linkedin.com/in/" not in url:
                    continue
                brand_words = brand_lower.split()
                if not any(w in combined for w in brand_words if len(w) > 3):
                    continue

                name_match = re.match(r"^(.+?)\s*[-–—|]", title)
                contact_name = re.sub(r"[^\w\s\-'À-ÿ]", "", name_match.group(1)).strip() if name_match else ""
                job_title = next((t for t in TARGET_TITLES if t.lower() in combined), "")

                if contact_name and len(contact_name) > 3:
                    parts = contact_name.split()
                    return {
                        "first_name": parts[0],
                        "last_name": parts[-1] if len(parts) > 1 else "",
                        "full_name": contact_name,
                        "job_title": job_title,
                        "linkedin": url.split("?")[0],
                    }
            time.sleep(1)
        except Exception:
            pass

    return {}


def ddg_worker(seller: dict) -> tuple:
    """Returns (seller_id, contact_dict). Runs in thread."""
    result = ddg_find_contact(
        seller["seller_name"],
        clean_domain(seller.get("company_domain") or ""),
    )
    return seller["id"], seller["seller_name"], result


# ── Phase 2 : Better Contact ───────────────────────────────────────────────────

def submit_batch(contacts: list) -> str:
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
        task_id = d.get("id")
        if task_id:
            _TASK_KEY[task_id] = key
            print(f"  Submitted {len(contacts)} contacts → task {task_id}", flush=True)
            return task_id
        if _looks_like_credit_error(r.status_code, d) and i < len(keys) - 1:
            print(f"  BC primary key failed ({r.status_code}), switching to fallback...", flush=True)
            continue
        print(f"  Submit failed: HTTP {r.status_code} {d}", flush=True)
        return None
    return None


def poll_until_done(task_id: str, max_minutes: int = 30) -> list:
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
        credits = d.get("credits_left", "?")
        print(f"  [{i*30}s] {status} | credits: {credits}", flush=True)
        if status == "terminated":
            _TASK_KEY.pop(task_id, None)
            return d.get("data", [])
        if status not in ("in progress", "pending", "processing", "on hold", "queued"):
            print(f"  Unexpected status: {status}", flush=True)
            _TASK_KEY.pop(task_id, None)
            break
    return []


# ── Supabase helpers ───────────────────────────────────────────────────────────

def upsert_contact(client, seller_id: str, bc_data: dict, ddg_data: dict, dry_run: bool):
    email = bc_data.get("contact_email_address")
    email_status = bc_data.get("contact_email_address_status", "")
    bc_name = bc_data.get("contact_full_name", "")
    title = bc_data.get("contact_job_title", "") or ddg_data.get("job_title", "")
    linkedin = bc_data.get("contact_linkedin_profile_url", "") or ddg_data.get("linkedin", "")

    confidence_map = {
        "valid": 95, "catch_all_safe": 75,
        "catch_all_not_safe": 55, "undeliverable": 30,
    }
    confidence = confidence_map.get(email_status, 40) if email else 0

    update = {"enriched_at": datetime.now(timezone.utc).isoformat()}
    if email:
        update["contact_email"] = email
        update["contact_confidence"] = confidence
    name = bc_name or ddg_data.get("full_name", "")
    if name:
        update["contact_name"] = name
    if title:
        update["contact_job_title"] = title
    if linkedin:
        update["contact_linkedin"] = linkedin

    if not dry_run:
        client.table("sellers").update(update).eq("id", seller_id).execute()

    return email, confidence


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-ddg", action="store_true", help="Skip DDG phase, use existing names only")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load sellers without email — pull linkedin + job_title so we can pass
    # them to Better Contact for a much higher match rate.
    r = client.table("sellers").select(
        "id, seller_name, company_domain, contact_name, contact_linkedin, contact_job_title"
    ).is_("contact_email", "null").execute()
    sellers = r.data or []
    if args.limit:
        sellers = sellers[:args.limit]

    print(f"\n{len(sellers)} sellers sans email à enrichir\n", flush=True)

    # Per-seller DDG result storage
    ddg_by_id: dict = {}  # seller_id → {full_name, first_name, last_name, job_title, linkedin}

    # ── Phase 1: DDG ────────────────────────────────────────────────────────
    if not args.skip_ddg:
        needs_ddg = [s for s in sellers if not s.get("contact_name")]
        print(f"Phase 1: DDG pour {len(needs_ddg)} sellers sans nom ({DDG_WORKERS} workers)...\n", flush=True)

        found_names = 0
        with ThreadPoolExecutor(max_workers=DDG_WORKERS) as pool:
            futures = {pool.submit(ddg_worker, s): s for s in needs_ddg}
            for fut in as_completed(futures):
                seller_id, seller_name, contact = fut.result()
                if contact:
                    ddg_by_id[seller_id] = contact
                    found_names += 1
                    print(f"  ✓ {seller_name}: {contact['full_name']} ({contact.get('job_title','-')})", flush=True)
                else:
                    print(f"  — {seller_name}: not found", flush=True)

        print(f"\nDDG: {found_names}/{len(needs_ddg)} noms trouvés\n", flush=True)

        # Persist names to Supabase now (even if BC fails later)
        if not args.dry_run and ddg_by_id:
            for sid, c in ddg_by_id.items():
                update = {"contact_name": c["full_name"]}
                if c.get("job_title"):
                    update["contact_job_title"] = c["job_title"]
                if c.get("linkedin"):
                    update["contact_linkedin"] = c["linkedin"]
                client.table("sellers").update(update).eq("id", sid).execute()
            print(f"Noms sauvegardés en Supabase.\n", flush=True)
    else:
        print("Phase 1: DDG skippée (--skip-ddg)\n", flush=True)

    # ── Phase 2: BC batch ────────────────────────────────────────────────────
    # Build contacts list; only include sellers where we have a name
    contacts = []
    id_map = {}  # index → (seller_id, ddg_data)

    for seller in sellers:
        domain = clean_domain(seller.get("company_domain") or "")
        if not domain:
            continue

        # Use existing name or DDG-found name
        name_str = (seller.get("contact_name") or "").strip()
        ddg = ddg_by_id.get(seller["id"], {})
        if not name_str and ddg:
            name_str = ddg.get("full_name", "")

        if not name_str:
            continue  # No name available, skip BC (would return nothing)

        parts = name_str.split()
        # Resolve linkedin/job_title from DDG result or from Supabase row
        linkedin = ddg.get("linkedin") or seller.get("contact_linkedin") or ""
        job_title = ddg.get("job_title") or seller.get("contact_job_title") or ""

        contact = {
            "company_domain": domain,
            "company_name": seller.get("seller_name") or "",
            "first_name": parts[0],
        }
        if len(parts) >= 2:
            contact["last_name"] = parts[-1]
        if linkedin:
            contact["linkedin_url"] = linkedin
        if job_title:
            contact["job_title"] = job_title

        idx = len(contacts)
        contacts.append(contact)
        id_map[idx] = (seller["id"], ddg)

    print(f"Phase 2: BC batch pour {len(contacts)} sellers avec nom...\n", flush=True)

    if not contacts:
        print("Aucun contact avec nom trouvé. Enrichissement terminé.", flush=True)
        return

    # Submit in batches
    tasks: dict = {}  # task_id → (start_idx, batch_size)
    for i in range(0, len(contacts), BATCH_SIZE):
        batch = contacts[i:i + BATCH_SIZE]
        if args.dry_run:
            print(f"  [DRY RUN] Would submit batch of {len(batch)} contacts", flush=True)
            continue
        task_id = submit_batch(batch)
        if task_id:
            tasks[task_id] = i
        time.sleep(2)

    if args.dry_run:
        print(f"\n[DRY RUN] Done. Would have submitted {len(contacts)} contacts.", flush=True)
        return

    # Poll all tasks
    enriched = 0
    not_found = 0
    for task_id, start_idx in tasks.items():
        print(f"\nPolling task {task_id} (batch from index {start_idx})...", flush=True)
        data = poll_until_done(task_id)

        if not data:
            print(f"  No results for task {task_id}", flush=True)
            continue

        for j, bc_contact in enumerate(data):
            seller_idx = start_idx + j
            entry = id_map.get(seller_idx)
            if not entry:
                continue
            seller_id, ddg = entry
            seller_name = next((s["seller_name"] for s in sellers if s["id"] == seller_id), "?")

            email, conf = upsert_contact(client, seller_id, bc_contact, ddg, args.dry_run)
            status = bc_contact.get("contact_email_address_status", "-")
            if email:
                print(f"  ✓ {seller_name}: {email} ({status}, {conf}%)", flush=True)
                enriched += 1
            else:
                print(f"  — {seller_name}: not found", flush=True)
                not_found += 1

    print(f"\nTerminé: {enriched} emails trouvés, {not_found} sans résultat", flush=True)


if __name__ == "__main__":
    main()
