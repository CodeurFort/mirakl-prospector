#!/usr/bin/env python3
"""
resume_bc_tasks.py — Polls pre-submitted Better Contact tasks and writes
results to Supabase. Use when enrich_hybrid.py was killed mid-polling: the
tasks are still running server-side, we just need to recover the output.

Usage:
    python resume_bc_tasks.py <task_id_1> <task_id_2> ...
"""
import os
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

BC_BASE = "https://app.bettercontact.rocks/api/v2"
BC_KEYS = [k for k in [
    os.getenv("BETTERCONTACT_API_KEY"),
    os.getenv("BETTERCONTACT_API_KEY_FALLBACK"),
] if k]

IN_PROGRESS = {"in progress", "pending", "processing", "on hold", "queued"}

CONFIDENCE = {
    "valid": 95,
    "catch_all_safe": 75,
    "catch_all_not_safe": 55,
    "undeliverable": 30,
    "not_found": 0,
}


def poll_task(task_id: str, max_minutes: int = 45) -> tuple:
    """Return (data, key_used) when terminated, or (None, None) on error/timeout."""
    from curl_cffi import requests as cf
    for key in BC_KEYS:
        for i in range(max_minutes * 2):
            r = cf.get(
                f"{BC_BASE}/async/{task_id}",
                headers={"X-API-Key": key},
                impersonate="chrome120",
                timeout=15,
            )
            if r.status_code == 404:
                # Wrong key for this task, try the next one
                print(f"  [{task_id[:12]}] 404 with this key, trying next...", flush=True)
                break
            try:
                d = r.json()
            except Exception:
                d = {}
            status = d.get("status", "")
            if i % 4 == 0:
                print(f"  [{task_id[:12]} t+{i*30}s] {status} credits={d.get('credits_left','?')}", flush=True)
            if status == "terminated":
                return d.get("data", []), key
            if status and status not in IN_PROGRESS:
                print(f"  [{task_id[:12]}] unexpected: {status}", flush=True)
                return None, None
            time.sleep(30)
        # If we fell out of the inner loop without terminating, try next key? No,
        # that would only help if the first key was wrong. Abort.
        break
    return None, None


def match_to_seller(client, bc_contact: dict, domain_index: dict) -> str:
    """Best-effort reverse lookup: bc.input.company_domain → seller.id via Supabase."""
    inp = bc_contact.get("input") or {}
    domain = (inp.get("company_domain") or "").strip().lower()
    if domain and domain in domain_index:
        return domain_index[domain]
    return ""


def main():
    if len(sys.argv) < 2:
        print("Usage: python resume_bc_tasks.py <task_id_1> [task_id_2 ...]")
        sys.exit(1)

    tasks = sys.argv[1:]
    print(f"Reprise de {len(tasks)} tasks BC\n", flush=True)

    from supabase import create_client
    client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

    # Build a reverse index domain → seller_id
    r = client.table("sellers").select("id, company_domain").execute()
    domain_index = {}
    for s in r.data or []:
        d = (s.get("company_domain") or "").strip().lower()
        if d:
            # Normalize (strip www., trailing slash)
            for pref in ("www.",):
                if d.startswith(pref):
                    d = d[len(pref):]
            d = d.rstrip("/")
            domain_index[d] = s["id"]

    total_enriched = 0
    total_no_email = 0

    for task_id in tasks:
        print(f"\n=== Task {task_id} ===", flush=True)
        data, _key = poll_task(task_id)
        if data is None:
            print(f"  Abandon.", flush=True)
            continue

        print(f"  Terminee: {len(data)} resultats", flush=True)

        for bc in data:
            seller_id = match_to_seller(client, bc, domain_index)
            email = bc.get("contact_email_address")
            if not seller_id:
                print(f"    ! seller non trouve pour domain={bc.get('input',{}).get('company_domain','?')}", flush=True)
                continue

            status = bc.get("contact_email_address_status", "")
            confidence = CONFIDENCE.get(status, 40) if email else 0

            update = {"enriched_at": datetime.now(timezone.utc).isoformat()}
            if email:
                update["contact_email"] = email
                update["contact_confidence"] = confidence
            if bc.get("contact_full_name"):
                update["contact_name"] = bc["contact_full_name"]
            if bc.get("contact_job_title"):
                update["contact_job_title"] = bc["contact_job_title"]
            if bc.get("contact_linkedin_profile_url"):
                update["contact_linkedin"] = bc["contact_linkedin_profile_url"]

            client.table("sellers").update(update).eq("id", seller_id).execute()

            if email:
                total_enriched += 1
                print(f"    + {email} ({status}, {confidence}%)", flush=True)
            else:
                total_no_email += 1

    print(f"\nResultat: {total_enriched} emails trouves, {total_no_email} sans email")


if __name__ == "__main__":
    main()
