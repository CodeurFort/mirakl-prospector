#!/usr/bin/env python3
"""
enrich_one.py — Enrichissement contacts via Better Contact (waterfall) + fallbacks.

Pipeline :
  1. DDG → trouve le nom du contact (si pas déjà en DB)
  2. Better Contact API → enrich avec nom+domaine (ou domaine seul)
  3. Fallback : génération de patterns email + generic emails
  4. Upsert Supabase : contact_name, contact_email, contact_job_title,
     contact_linkedin, contact_confidence, company_size_id, enriched_at

Usage:
    python enrich_one.py --id <supabase_uuid>
    python enrich_one.py --id <uuid> --dry-run

Output: JSON sur stdout, logs sur stderr.
"""
import sys
import json
import re
import time
import argparse
import unicodedata
import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BETTERCONTACT_KEY = os.getenv("BETTERCONTACT_API_KEY", "")
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY", "")

BC_BASE = "https://app.bettercontact.rocks/api/v2"
BC_ASYNC = f"{BC_BASE}/async"

# ── Domain cleaning ────────────────────────────────────────────────────────────

def clean_domain(raw: str) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    for prefix in ("https://www.", "http://www.", "https://", "http://", "www."):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
            break
    return raw.rstrip("/").split("/")[0]


# ── Better Contact API ─────────────────────────────────────────────────────────

def bc_submit(contacts: list) -> Optional[str]:
    """Submit enrichment request, return task ID."""
    try:
        from curl_cffi import requests as cf
        r = cf.post(
            BC_ASYNC,
            json={
                "data": contacts,
                "enrich_email_address": True,
                "enrich_phone_number": False,
            },
            headers={"X-API-Key": BETTERCONTACT_KEY},
            impersonate="chrome120",
            timeout=15,
        )
        d = r.json()
        task_id = d.get("id")
        print(f"  Better Contact task: {task_id} (HTTP {r.status_code})", file=sys.stderr)
        return task_id
    except Exception as e:
        print(f"  Better Contact submit error: {e}", file=sys.stderr)
        return None


def bc_poll(task_id: str, max_wait: int = 120) -> Optional[dict]:
    """Poll until terminated, return first contact data."""
    try:
        from curl_cffi import requests as cf
        url = f"{BC_BASE}/async/{task_id}"
        for _ in range(max_wait // 6):
            time.sleep(6)
            r = cf.get(url, headers={"X-API-Key": BETTERCONTACT_KEY}, impersonate="chrome120", timeout=10)
            d = r.json()
            status = d.get("status", "")
            credits = d.get("credits_left", "?")
            print(f"  → {status} | credits: {credits}", file=sys.stderr)
            if status == "terminated":
                data = d.get("data", [])
                return data[0] if data else None
            if status not in ("in progress", "pending"):
                break
        return None
    except Exception as e:
        print(f"  Better Contact poll error: {e}", file=sys.stderr)
        return None


def enrich_via_bettercontact(first_name: str, last_name: str, domain: str) -> dict:
    """Main Better Contact enrichment. Returns parsed contact info."""
    contacts = []
    if first_name and last_name:
        contacts.append({
            "first_name": first_name,
            "last_name": last_name,
            "company_domain": domain,
        })
    else:
        contacts.append({"company_domain": domain})

    task_id = bc_submit(contacts)
    if not task_id:
        return {}

    result = bc_poll(task_id)
    if not result:
        return {}

    email = result.get("contact_email_address")
    email_status = result.get("contact_email_address_status", "")
    name = result.get("contact_full_name", "")
    title = result.get("contact_job_title", "")
    linkedin = result.get("contact_linkedin_profile_url", "")
    employees = result.get("company_employees_number")

    # Confidence based on email status
    confidence_map = {
        "valid": 95,
        "catch_all_safe": 75,
        "catch_all_not_safe": 55,
        "undeliverable": 30,
        "not_found": 0,
    }
    confidence = confidence_map.get(email_status, 40) if email else 0

    print(f"  → email: {email} ({email_status}, {confidence}%)", file=sys.stderr)
    if name:
        print(f"  → name: {name} | {title}", file=sys.stderr)

    return {
        "contact_email": email,
        "contact_confidence": confidence,
        "contact_name": name,
        "contact_job_title": title,
        "contact_linkedin": linkedin,
        "company_employees": employees,
        "email_status": email_status,
    }


# ── DDG contact search ─────────────────────────────────────────────────────────

def ddg_find_contact(name: str, domain: str) -> dict:
    try:
        from curl_cffi import requests as cf_requests
    except ImportError:
        return {}

    TARGET_TITLES = [
        "CEO", "Founder", "Co-Founder", "Head of Partnerships", "Head of Sales",
        "Head of E-commerce", "E-commerce Director", "CMO", "Marketplace Manager",
        "Business Development", "Chief Commercial", "VP Sales", "VP E-commerce",
        "Fondateur", "Fondatrice", "Directeur Commercial", "Directeur E-commerce",
        "Responsable Partenariats", "Directeur Général",
    ]

    queries = [
        f"{name} fondateur CEO founder linkedin",
        f"{name} directeur e-commerce marketplace linkedin",
    ]

    for query in queries:
        try:
            r = cf_requests.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                impersonate="chrome120",
                timeout=10,
            )
            links = re.findall(
                r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?'
                r'class="result__snippet"[^>]*>(.*?)</(?:a|td)',
                r.text, re.DOTALL,
            )
            brand_lower = name.lower()
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


# ── Fallback: generic emails ───────────────────────────────────────────────────

def generic_emails(domain: str, country: str = "FR") -> list:
    if country in ("FR", "BE", "CH"):
        return [f"contact@{domain}", f"bonjour@{domain}", f"info@{domain}",
                f"hello@{domain}", f"presse@{domain}", f"commercial@{domain}"]
    return [f"contact@{domain}", f"hello@{domain}", f"info@{domain}",
            f"press@{domain}", f"sales@{domain}", f"partnerships@{domain}"]


# ── Apollo company size ────────────────────────────────────────────────────────

def apollo_company_size(domain: str) -> Optional[str]:
    if not APOLLO_API_KEY or not domain:
        return None
    try:
        import urllib.request
        url = f"https://api.apollo.io/api/v1/organizations/enrich?domain={domain}"
        req = urllib.request.Request(url, headers={"X-Api-Key": APOLLO_API_KEY})
        resp = urllib.request.urlopen(req, timeout=10)
        org = json.loads(resp.read()).get("organization", {})
        employees = org.get("estimated_num_employees", 0) or 0
        if employees <= 10:     return "Micro (1-10)"
        if employees <= 50:     return "Small (10-50)"
        if employees <= 250:    return "Medium (50-250)"
        return "Large (250+)"
    except Exception:
        return None


SIZE_REFS_CACHE: dict = {}

def get_size_id(client, label: str) -> Optional[str]:
    if not SIZE_REFS_CACHE:
        r = client.table("ref_company_sizes").select("id, label").execute()
        for row in (r.data or []):
            SIZE_REFS_CACHE[row["label"].lower()] = row["id"]
    return SIZE_REFS_CACHE.get(label.lower())


# ── Main ───────────────────────────────────────────────────────────────────────

def enrich_seller(seller_id: str, dry_run: bool = False) -> dict:
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    r = client.table("sellers").select(
        "id, seller_name, company_domain, contact_name, contact_email, contact_job_title, enriched_at"
    ).eq("id", seller_id).single().execute()

    if not r.data:
        return {"error": f"Seller {seller_id} introuvable"}

    seller = r.data
    name = seller["seller_name"]
    domain = clean_domain(seller.get("company_domain") or "")

    print(f"\n=== {name} ({domain}) ===", file=sys.stderr)

    update: dict = {}

    # ── 1. Find contact name via DDG ─────────────────────────────────────────
    existing_name = seller.get("contact_name", "") or ""
    first_name, last_name = "", ""

    if existing_name:
        parts = existing_name.strip().split()
        first_name = parts[0]
        last_name = parts[-1] if len(parts) > 1 else ""
        print(f"  Using existing name: {existing_name}", file=sys.stderr)
    elif domain:
        print("  [1] DDG contact search...", file=sys.stderr)
        contact = ddg_find_contact(name, domain)
        if contact:
            first_name = contact["first_name"]
            last_name = contact["last_name"]
            update["contact_name"] = contact["full_name"]
            update["contact_job_title"] = contact["job_title"]
            update["contact_linkedin"] = contact["linkedin"]
            print(f"  → {contact['full_name']} | {contact['job_title']}", file=sys.stderr)
        time.sleep(1)

    # ── 2. Better Contact enrichment ─────────────────────────────────────────
    if domain and BETTERCONTACT_KEY:
        print("  [2] Better Contact...", file=sys.stderr)
        bc = enrich_via_bettercontact(first_name, last_name, domain)

        if bc.get("contact_email"):
            update["contact_email"] = bc["contact_email"]
            update["contact_confidence"] = bc["contact_confidence"]

        # Override name/title from BC if better
        if bc.get("contact_name") and not update.get("contact_name"):
            update["contact_name"] = bc["contact_name"]
        if bc.get("contact_job_title") and not update.get("contact_job_title"):
            update["contact_job_title"] = bc["contact_job_title"]
        if bc.get("contact_linkedin") and not update.get("contact_linkedin"):
            update["contact_linkedin"] = bc["contact_linkedin"]

    # ── 3. Fallback generic email ────────────────────────────────────────────
    if not update.get("contact_email") and domain:
        print("  [3] Fallback generic email", file=sys.stderr)
        update["contact_email"] = f"contact@{domain}"
        update["contact_confidence"] = 20

    # ── 4. Apollo company size ───────────────────────────────────────────────
    if domain:
        size_label = apollo_company_size(domain)
        if size_label:
            size_id = get_size_id(client, size_label)
            if size_id:
                update["company_size_id"] = size_id
                print(f"  Apollo: {size_label}", file=sys.stderr)

    update["enriched_at"] = datetime.now(timezone.utc).isoformat()

    if not dry_run and update:
        client.table("sellers").update(update).eq("id", seller_id).execute()
        print("  ✓ Supabase updated", file=sys.stderr)
    elif dry_run:
        print(f"  [DRY RUN] Would update: {list(update.keys())}", file=sys.stderr)

    result = {
        "seller_id": seller_id,
        "seller_name": name,
        "contact_name": update.get("contact_name", existing_name),
        "contact_email": update.get("contact_email", ""),
        "contact_linkedin": update.get("contact_linkedin", ""),
        "contact_job_title": update.get("contact_job_title", ""),
        "contact_confidence": update.get("contact_confidence", 0),
        "enriched_at": update["enriched_at"],
    }

    print(json.dumps(result))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    enrich_seller(args.id, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
