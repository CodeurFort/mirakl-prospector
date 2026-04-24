#!/usr/bin/env python3
"""
Enrichment script — fills contact & company data for sellers in Supabase.

Sources:
  1. Apollo (organizations/enrich) → company_size
  2. DuckDuckGo HTML search → contact_name, contact_job_title, contact_linkedin
  3. Email pattern guessing → contact_email, contact_confidence
"""
import os
import re
import time
import unicodedata
from datetime import datetime, timezone
from urllib.parse import unquote

import requests
from curl_cffi import requests as cf_requests
from dotenv import load_dotenv

load_dotenv()

APOLLO_API_KEY = os.getenv("APOLLO_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Job titles we target (decision makers for marketplace partnerships)
TARGET_TITLES = [
    "CEO", "Founder", "Co-Founder", "Directeur Général", "Directrice Générale",
    "Head of Partnerships", "Head of Sales", "Head of E-commerce",
    "Head of Retail", "Head of Business Development",
    "Marketplace Manager", "E-commerce Manager", "E-commerce Director",
    "Business Development", "Chief Commercial", "CMO",
    "VP Sales", "VP E-commerce", "VP Business Development",
    "Fondateur", "Fondatrice", "Directeur Commercial",
    "Directeur E-commerce", "Responsable Partenariats",
    "Responsable E-commerce", "Responsable Marketplace",
    "Directeur", "Directrice",
]

# Size mapping: employee count → ref_company_sizes label (matches Supabase)
SIZE_BRACKETS = [
    (10, "Micro (1-10)"),
    (50, "Small (10-50)"),
    (250, "Medium (50-250)"),
    (float("inf"), "Large (250+)"),
]


def _map_employee_count(count: int) -> str:
    for threshold, label in SIZE_BRACKETS:
        if count <= threshold:
            return label
    return "Medium (50-250)"


# ─── Apollo: Company Size ─────────────────────────────────────────────

def enrich_company_apollo(domain: str) -> dict:
    """Call Apollo organizations/enrich to get company size."""
    if not APOLLO_API_KEY or not domain:
        return {}
    try:
        r = requests.get(
            "https://api.apollo.io/api/v1/organizations/enrich",
            headers={"Content-Type": "application/json", "X-Api-Key": APOLLO_API_KEY},
            params={"domain": domain},
            timeout=10,
        )
        if r.status_code != 200:
            return {}
        org = r.json().get("organization")
        if not org:
            return {}
        employees = org.get("estimated_num_employees") or 0
        return {
            "employees": employees,
            "size_label": _map_employee_count(employees),
            "industry": org.get("industry", ""),
        }
    except Exception:
        return {}


# ─── DuckDuckGo HTML: Contact Search ─────────────────────────────────

def _ddg_html_search(query: str, max_results: int = 10) -> list:
    """Search DuckDuckGo via HTML endpoint (bypasses API rate limits)."""
    try:
        r = cf_requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            impersonate="chrome110",
            timeout=10,
        )
        if r.status_code != 200:
            return []

        results = []
        # Parse result blocks: each has class="result__a" for the link
        links = re.findall(
            r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?'
            r'class="result__snippet"[^>]*>(.*?)</(?:a|td)',
            r.text, re.DOTALL,
        )
        for raw_url, raw_title, raw_snippet in links[:max_results]:
            # Decode DDG redirect URL
            url_match = re.search(r"uddg=([^&]+)", raw_url)
            url = unquote(url_match.group(1)) if url_match else raw_url
            title = re.sub(r"<[^>]+>", "", raw_title).strip()
            snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
            results.append({"url": url, "title": title, "snippet": snippet})
        return results
    except Exception:
        return []


def _clean_name(raw: str) -> str:
    """Clean a name extracted from search results."""
    cleaned = re.sub(r"[^\w\s\-'À-ÿ]", "", raw, flags=re.UNICODE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_contact(brand_name: str, domain: str = "") -> dict:
    """Search for a decision-maker contact at the brand via DDG HTML."""
    queries = [
        f"{brand_name} fondateur CEO founder linkedin",
        f"{brand_name} directeur e-commerce marketplace linkedin",
    ]

    for query in queries:
        results = _ddg_html_search(query)
        if not results:
            time.sleep(2)
            continue

        brand_lower = brand_name.lower()

        for r in results:
            url = r["url"]
            title = r["title"]
            snippet = r["snippet"]
            combined = f"{title} {snippet}".lower()

            # Must be a LinkedIn profile (not company page)
            if "linkedin.com/in/" not in url:
                continue

            # Must mention the brand
            brand_words = brand_lower.split()
            if not any(w in combined for w in brand_words if len(w) > 3):
                if brand_lower not in combined:
                    continue

            # Extract name: "Prénom Nom - Title | LinkedIn" or "Prénom Nom – ..."
            name_match = re.match(r"^(.+?)\s*[-–—|]", title)
            contact_name = _clean_name(name_match.group(1)) if name_match else ""

            # Extract job title
            job_title = ""
            for target in TARGET_TITLES:
                if target.lower() in combined:
                    job_title = target
                    break
            if not job_title and " - " in title:
                parts = title.split(" - ")
                if len(parts) >= 2:
                    job_title = parts[1].strip()[:80]

            if contact_name and len(contact_name) > 3:
                # Clean LinkedIn URL
                linkedin_url = url.split("?")[0]
                return {
                    "contact_name": contact_name,
                    "contact_job_title": job_title,
                    "contact_linkedin": linkedin_url,
                }

        time.sleep(1.5)

    # Fallback: try to find founder name from brand website "about" page or press
    if domain:
        about_results = _ddg_html_search(f"site:{domain} fondateur OR founder OR \"à propos\"")
        for r in about_results:
            snippet = r["snippet"]
            # Look for "fondée par X" or "founded by X" patterns
            founder_match = re.search(
                r"(?:fondée? par|founded by|créée? par|co-fondée? par)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)+)",
                snippet
            )
            if founder_match:
                name = _clean_name(founder_match.group(1))
                return {
                    "contact_name": name,
                    "contact_job_title": "Fondateur",
                    "contact_linkedin": "",
                }

    return {}


# ─── Email Pattern Guessing ──────────────────────────────────────────

def _strip_accents(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn")


def guess_email(contact_name: str, domain: str) -> dict:
    """Guess professional email from name + domain."""
    if not contact_name or not domain:
        return {}

    parts = contact_name.strip().split()
    if len(parts) < 2:
        return {}

    first = _strip_accents(parts[0]).lower()
    last = _strip_accents(parts[-1]).lower()
    first = re.sub(r"[^a-z]", "", first)
    last = re.sub(r"[^a-z]", "", last)

    if not first or not last:
        return {}

    # firstname.lastname is the most common pattern for DTC brands
    email = f"{first}.{last}@{domain}"
    return {"contact_email": email, "contact_confidence": 55}


# ─── Main Enrichment Pipeline ────────────────────────────────────────

def run_enrichment(limit: int = 0, dry_run: bool = False):
    """Enrich sellers in Supabase with company size + contact info."""
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load company size references
    r = client.table("ref_company_sizes").select("id, label").execute()
    size_refs = {row["label"].lower(): row["id"] for row in r.data}

    # Fetch sellers that haven't been enriched yet
    query = client.table("sellers").select("id, seller_name, company_domain").is_("enriched_at", "null")
    if limit > 0:
        query = query.limit(limit)
    r = query.execute()
    sellers = r.data or []

    print(f"\n  {len(sellers)} sellers à enrichir")
    if not sellers:
        return

    enriched = 0
    errors = 0

    for i, seller in enumerate(sellers):
        name = seller["seller_name"]
        domain = seller.get("company_domain") or ""
        seller_id = seller["id"]

        print(f"\n  [{i+1}/{len(sellers)}] {name} ({domain})")

        update = {}

        # 1. Apollo: company size
        if domain:
            apollo = enrich_company_apollo(domain)
            if apollo.get("size_label"):
                size_id = size_refs.get(apollo["size_label"].lower())
                if size_id:
                    update["company_size_id"] = size_id
                    print(f"    Apollo: {apollo['employees']} employees → {apollo['size_label']}")
            time.sleep(0.5)

        # 2. DDG HTML: contact search
        contact = search_contact(name, domain)
        if contact:
            update["contact_name"] = contact.get("contact_name", "")
            update["contact_job_title"] = contact.get("contact_job_title", "")
            update["contact_linkedin"] = contact.get("contact_linkedin", "")
            print(f"    Contact: {contact.get('contact_name')} — {contact.get('contact_job_title')}")

            # 3. Email pattern guess
            if domain and contact.get("contact_name"):
                email_data = guess_email(contact["contact_name"], domain)
                if email_data:
                    update["contact_email"] = email_data["contact_email"]
                    update["contact_confidence"] = email_data["contact_confidence"]
                    print(f"    Email: {email_data['contact_email']} (confidence: {email_data['contact_confidence']}%)")
        else:
            print(f"    Contact: non trouvé")

        # 4. Mark as enriched
        if update:
            update["enriched_at"] = datetime.now(timezone.utc).isoformat()
            if not dry_run:
                try:
                    client.table("sellers").update(update).eq("id", seller_id).execute()
                    enriched += 1
                except Exception as e:
                    print(f"    [!] Supabase error: {e}")
                    errors += 1
            else:
                print(f"    [DRY RUN] Would update: {list(update.keys())}")
                enriched += 1
        else:
            if not dry_run:
                client.table("sellers").update(
                    {"enriched_at": datetime.now(timezone.utc).isoformat()}
                ).eq("id", seller_id).execute()

        time.sleep(1.5)

    print(f"\n  Enrichissement terminé: {enriched}/{len(sellers)} enrichis, {errors} erreurs")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Enrich sellers with contact & company data")
    parser.add_argument("--limit", "-n", type=int, default=0, help="Max sellers to enrich (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to Supabase")
    args = parser.parse_args()
    run_enrichment(limit=args.limit, dry_run=args.dry_run)
