#!/usr/bin/env python3
"""
find_contacts.py — Trouve les noms de contacts via Google/LinkedIn (Apify).

Pipeline :
  1. Charge sellers sans contact_name depuis Supabase
  2. Lance Apify Google Search scraper (1 requête/seller)
  3. Extrait les noms depuis les URLs LinkedIn trouvées
  4. Met à jour contact_name en Supabase
  5. (optionnel) Lance immédiatement bettercontact_batch.py --skip-ddg

Usage:
    python find_contacts.py [--dry-run] [--limit N] [--then-enrich]
"""
import sys
import os
import json
import re
import time
import argparse
from datetime import datetime, timezone
from urllib.parse import urlencode

import urllib.request
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")

APIFY_BASE = "https://api.apify.com/v2"

DECISION_TITLES = {
    "ceo", "chief executive", "president", "fondateur", "fondatrice",
    "founder", "co-founder", "cofondateur", "cofondatrice",
    "directeur général", "directrice générale", "dg ", "pdg",
    "head of", "vp ", "chief marketing", "cmo", "cco",
    "e-commerce", "ecommerce", "commercial", "partnerships",
    "marketplace", "digital", "brand",
}

# Last names that are actually title/role abbreviations — discard
FAKE_LASTNAMES = {"co", "ceo", "cto", "coo", "cfo", "vp", "md", "gm", "dg", "nee", "née"}


def apify_post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{APIFY_BASE}/{path}?token={APIFY_TOKEN}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=20)
    return json.loads(resp.read()).get("data", {})


def apify_get(path: str) -> dict:
    req = urllib.request.Request(
        f"{APIFY_BASE}/{path}?token={APIFY_TOKEN}",
        headers={"Accept": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read()).get("data", {})


def apify_dataset(dataset_id: str) -> list:
    req = urllib.request.Request(
        f"{APIFY_BASE}/datasets/{dataset_id}/items?token={APIFY_TOKEN}&format=json",
        headers={"Accept": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def wait_for_run(run_id: str, max_minutes: int = 15) -> str:
    for i in range(max_minutes * 4):
        time.sleep(15)
        run = apify_get(f"actor-runs/{run_id}")
        status = run.get("status", "")
        elapsed = i * 15
        print(f"  [{elapsed}s] {status}", flush=True)
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            return status
    return "TIMEOUT"


def name_from_linkedin_url(url: str) -> tuple:
    """Extract (first_name, last_name) from linkedin.com/in/slug."""
    m = re.search(r"linkedin\.com/in/([a-zA-Z0-9\-]+)", url)
    if not m:
        return "", ""
    slug = m.group(1)
    # Remove trailing ID suffix (4-8 alphanumeric chars)
    slug = re.sub(r"-[a-z0-9]{4,8}$", "", slug)
    parts = slug.split("-")
    # Filter single chars and digits
    parts = [p for p in parts if len(p) > 1 and not p.isdigit()]
    # Take only first 2-3 parts as name (rest is company/role)
    parts = parts[:3]
    if len(parts) >= 2:
        first = parts[0].capitalize()
        last = " ".join(p.capitalize() for p in parts[1:])
        # Reject if last name looks like a role abbreviation
        if last.lower() in FAKE_LASTNAMES:
            return parts[0].capitalize(), ""
        return first, last
    if parts:
        return parts[0].capitalize(), ""
    return "", ""


def score_result(title: str, snippet: str, seller_name: str) -> int:
    """Score a search result by relevance. Higher = better."""
    combined = (title + " " + snippet).lower()
    seller_words = [w for w in seller_name.lower().split() if len(w) > 2]

    # Must mention the seller brand
    brand_hits = sum(1 for w in seller_words if w in combined)
    if brand_hits == 0:
        return 0

    # Bonus for decision-maker titles
    title_score = sum(2 for kw in DECISION_TITLES if kw in combined)

    return brand_hits * 3 + title_score


def build_queries(sellers: list) -> list:
    queries = []
    for s in sellers:
        name = s["seller_name"]
        queries.append(f'site:linkedin.com/in "{name}" fondateur OR CEO OR directeur')
    return queries


def run_google_search(queries: list) -> dict:
    """Run Apify Google Search on a list of queries. Returns {query → [results]}."""
    print(f"\nLancement Apify Google Search ({len(queries)} requêtes)...", flush=True)

    # Apify Google Search takes queries as newline-separated string
    run = apify_post("acts/apify~google-search-scraper/runs", {
        "queries": "\n".join(queries),
        "maxPagesPerQuery": 1,
        "resultsPerPage": 5,
        "mobileResults": False,
        "languageCode": "fr",
        "countryCode": "fr",
    })
    run_id = run.get("id")
    print(f"Run ID: {run_id}", flush=True)

    status = wait_for_run(run_id)
    print(f"  Terminé: {status}", flush=True)

    if status != "SUCCEEDED":
        return {}

    items = apify_dataset(run.get("defaultDatasetId", ""))
    result = {}
    for item in items:
        q = item.get("searchQuery", {}).get("term", "")
        result[q] = item.get("organicResults", [])
    return result


MIN_SCORE = 5  # discard results below this threshold

ROLE_WORDS = re.compile(
    r"\b(co-founder|cofondateur|fondateur|fondatrice|founder|ceo|president|"
    r"directeur|directrice|chairman|partner|associé)\b",
    re.IGNORECASE,
)


COMPANY_INDICATORS = re.compile(
    r"\b(clothing|studio|fashion|lingerie|paris|london|brand|wear|store|shop|"
    r"design|collection|official|the|les|la|le|une|un)\b",
    re.IGNORECASE,
)


def looks_like_person_name(name_str: str) -> bool:
    """Return False if the string looks like a company name rather than a person name."""
    parts = name_str.strip().split()
    if len(parts) > 4:
        return False
    # If more than 1 word matches company indicators, likely not a person
    company_hits = sum(1 for p in parts if COMPANY_INDICATORS.match(p))
    if company_hits >= 2:
        return False
    # Must have at least one part starting with uppercase
    if not any(p[0].isupper() for p in parts if p):
        return False
    return True


def extract_name_from_title(title: str) -> tuple:
    """Parse first_name, last_name from a LinkedIn result title like 'John Smith - CEO at Brand'."""
    m = re.match(r"^([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\-' ]{2,35}?)\s*[-–|·]", title)
    if not m:
        return "", ""
    name_str = m.group(1).strip()
    # Drop role words inside the name portion
    name_str = ROLE_WORDS.sub("", name_str).strip()
    # Remove stray "Nee" / "née" (maiden name markers)
    name_str = re.sub(r"\bNee\b", "", name_str, flags=re.IGNORECASE).strip()
    # Remove trailing punctuation/spaces
    name_str = re.sub(r"[\s,\-]+$", "", name_str)

    if not looks_like_person_name(name_str):
        return "", ""

    parts = name_str.split()
    parts = [p for p in parts if len(p) > 1]
    if not parts:
        return "", ""
    first = parts[0]
    last = parts[-1] if len(parts) > 1 else ""
    if last.lower() in FAKE_LASTNAMES:
        last = ""
    return first, last


def extract_contact_from_results(results: list, seller_name: str) -> dict:
    """Find best LinkedIn match for a seller from Google results."""
    best = None
    best_score = 0

    for r in results:
        url = r.get("url", "")
        title = r.get("title", "")
        snippet = r.get("description", "") or r.get("snippet", "")

        if "linkedin.com/in/" not in url:
            continue

        score = score_result(title, snippet, seller_name)
        if score < MIN_SCORE or score <= best_score:
            continue

        # Prefer name from title (more readable), fallback to URL slug
        first, last = extract_name_from_title(title)
        if not first:
            first, last = name_from_linkedin_url(url)
            # Validate URL-extracted name too
            full = f"{first} {last}".strip()
            if not looks_like_person_name(full):
                continue
        if not first:
            continue

        combined = (title + " " + snippet).lower()
        job_title = next((kw.title() for kw in DECISION_TITLES if kw in combined), "")

        best_score = score
        best = {
            "first_name": first,
            "last_name": last,
            "full_name": f"{first} {last}".strip(),
            "job_title": job_title,
            "linkedin": url.split("?")[0],
            "score": score,
        }

    return best or {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--then-enrich", action="store_true",
                        help="Launch bettercontact_batch.py after finding names")
    args = parser.parse_args()

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load sellers without contact_name and without email
    r = client.table("sellers").select(
        "id, seller_name, company_domain"
    ).is_("contact_name", "null").is_("contact_email", "null").execute()

    sellers = r.data or []
    if args.limit:
        sellers = sellers[:args.limit]

    print(f"\n{len(sellers)} sellers sans nom de contact\n", flush=True)

    if not sellers:
        print("Rien à faire.")
        return

    # Build and run Google queries
    queries = build_queries(sellers)
    search_results = run_google_search(queries)

    # Match results back to sellers
    found = 0
    for seller in sellers:
        name = seller["seller_name"]
        query = f'site:linkedin.com/in "{name}" fondateur OR CEO OR directeur'
        results = search_results.get(query, [])
        contact = extract_contact_from_results(results, name)

        if contact and contact.get("full_name"):
            found += 1
            print(f"  ✓ {name}: {contact['full_name']} ({contact.get('job_title','-')}) [score={contact['score']}]", flush=True)
            if not args.dry_run:
                update = {"contact_name": contact["full_name"]}
                if contact.get("job_title"):
                    update["contact_job_title"] = contact["job_title"]
                if contact.get("linkedin"):
                    update["contact_linkedin"] = contact["linkedin"]
                client.table("sellers").update(update).eq("id", seller["id"]).execute()
        else:
            print(f"  — {name}: not found (results: {len(results)})", flush=True)

    print(f"\n{found}/{len(sellers)} noms trouvés", flush=True)

    if args.then_enrich and not args.dry_run and found > 0:
        print("\nLancement de bettercontact_batch.py --skip-ddg...", flush=True)
        import subprocess
        subprocess.run([sys.executable, "bettercontact_batch.py", "--skip-ddg"], check=False)


if __name__ == "__main__":
    main()
