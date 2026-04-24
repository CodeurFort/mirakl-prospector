#!/usr/bin/env python3
"""
scrape_one.py — Scrape et score un vendeur unique depuis l'app Next.js.

Usage:
    python scrape_one.py --name "AGMES" --domain "agmesnyc.com"

Output: JSON sur stdout (dernière ligne), logs sur stderr.
"""
import sys
import json
import argparse
import re
import time
from typing import Optional

from config import MARKETPLACE_PROFILES, SUPABASE_URL, SUPABASE_KEY
from scoring import score_seller_for_marketplace


# ── Inférence pays depuis le TLD du domaine ──────────────────────────────────

TLD_COUNTRY = {
    ".fr": "FR", ".de": "DE", ".co.uk": "UK", ".uk": "UK",
    ".it": "IT", ".es": "ES", ".nl": "NL", ".be": "BE",
    ".se": "SE", ".dk": "DK", ".at": "AT", ".pl": "PL",
    ".pt": "PT", ".ch": "CH", ".au": "AU", ".ca": "CA",
    ".jp": "JP",
}


def infer_country(domain: str) -> str:
    if not domain:
        return "US"
    domain = domain.lower().strip().lstrip("www.")
    for tld, country in TLD_COUNTRY.items():
        if domain.endswith(tld):
            return country
    return "US"


# ── Profiling brand via DuckDuckGo HTML ──────────────────────────────────────

def _ddg_search(query: str) -> list:
    try:
        from curl_cffi import requests as cf_requests
        r = cf_requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            impersonate="chrome110",
            timeout=10,
        )
        if r.status_code != 200:
            return []
        links = re.findall(
            r'class="result__snippet"[^>]*>(.*?)</(?:a|td)',
            r.text, re.DOTALL,
        )
        return [re.sub(r"<[^>]+>", "", l).strip() for l in links[:5]]
    except Exception:
        return []


CATEGORY_KEYWORDS = {
    # Specific fashion keywords — avoid weak terms like "wear", "home", "sport"
    # that appear in unrelated contexts
    "fashion": [
        "clothing brand", "fashion brand", "apparel", "dress", "denim",
        "womenswear", "menswear", "ready-to-wear", "vetements",
        "collection mode", "maison de mode", "mode femme", "mode homme",
        "t-shirt", "knitwear", "outerwear", "lingerie",
    ],
    "footwear": ["shoes", "sneakers", "boots", "sandals", "chaussures", "footwear brand"],
    "beauty": [
        "skincare", "makeup", "cosmetics", "parfum", "beauty brand",
        "soin visage", "maquillage", "fragrance brand",
    ],
    "accessories": [
        "handbag", "jewelry", "jewellery", "watch brand", "sunglasses",
        "bijoux", "sac a main", "leather goods", "maroquinerie",
    ],
    "sports": [
        "sportswear", "running brand", "fitness apparel", "activewear",
        "performance wear", "yoga wear",
    ],
    "kids": ["kidswear", "childrenswear", "babywear", "toddler clothing", "enfants vetements"],
    "luxury": [
        "luxury brand", "luxe", "haute couture", "couture house",
        "fine jewelry", "maroquinerie de luxe",
    ],
    "home": ["home decor brand", "maison decoration", "interior brand", "furniture brand"],
}

PRICE_KEYWORDS = {
    "luxury": ["luxury", "luxe", "haute couture", "fine jewelry", "couture", "exclusive"],
    "premium": ["premium", "designer", "upscale", "curated", "artisan", "high-end"],
    "mid": ["mid-range", "affordable", "contemporary", "accessible"],
    "budget": ["budget", "discount", "low-cost", "économique"],
}


# Brands clearly out of Mirakl Fashion scope — fast-fail without even calling DDG
OUT_OF_SCOPE_KEYWORDS = [
    # Automotive & tires
    "tire", "tyre", "pneu", "automobile", "voiture", "car brand", "vehicle",
    "motorcycle", "moto", "truck", "camion",
    # Food / grocery / beverages
    "food", "grocery", "restaurant", "beverage", "alcohol", "wine", "beer",
    "coffee shop", "bakery", "cafe",
    # Industry / B2B / services
    "industrial", "manufacturing", "machinery", "pharmaceutical", "bank",
    "insurance", "telecom", "utility", "oil", "gas", "energy", "software",
    "saas", "consulting", "agency", "hospital", "clinic",
    # Media / entertainment
    "newspaper", "magazine", "tv channel", "streaming", "gaming", "casino",
]

# Minimum number of fashion-scope keyword hits to trust the category detection.
# With the stricter (multi-word) keywords, requiring >=2 hits protects against
# coincidental matches in unrelated brand snippets.
MIN_CATEGORY_HITS = 2


def profile_brand(name: str, domain: str) -> dict:
    print(f"  Profiling {name} ({domain})...", file=sys.stderr)
    snippets = _ddg_search(f"{name} {domain} brand fashion category")
    time.sleep(1.5)
    combined = " ".join(snippets).lower()

    # 1) Hard-fail if the brand is clearly in an unrelated vertical
    out_of_scope_hit = next((kw for kw in OUT_OF_SCOPE_KEYWORDS if kw in combined), None)
    if out_of_scope_hit:
        print(f"  → out-of-scope vertical detected: '{out_of_scope_hit}'", file=sys.stderr)
        return {
            "category": None,
            "price": None,
            "country": infer_country(domain),
            "in_scope": False,
            "reason": f"Marque detectee dans un univers hors Mirakl Fashion (mot-cle: {out_of_scope_hit}).",
            "snippets_found": len(snippets),
        }

    # 2) Count category hits to avoid the silent fashion fallback
    category_hits: dict = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in combined)
        if hits > 0:
            category_hits[cat] = hits

    if not category_hits or sum(category_hits.values()) < MIN_CATEGORY_HITS:
        reason = (
            "Aucun signal de categorie Fashion/Beauty/Accessoires detecte."
            if snippets
            else "Aucun resultat web exploitable pour cette marque."
        )
        print(f"  → no category signal found, flagging out-of-scope", file=sys.stderr)
        return {
            "category": None,
            "price": None,
            "country": infer_country(domain),
            "in_scope": False,
            "reason": reason,
            "snippets_found": len(snippets),
        }

    # 3) Category = the one with the most keyword hits
    category = max(category_hits, key=category_hits.get)

    # 4) Price detection: still needs a default, but at least we're sure the brand is in scope
    price = "mid"
    for pr, keywords in PRICE_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            price = pr
            break

    country = infer_country(domain)

    print(
        f"  → category={category} ({category_hits[category]} hits), price={price}, country={country}",
        file=sys.stderr,
    )
    return {
        "category": category,
        "price": price,
        "country": country,
        "in_scope": True,
        "category_hits": category_hits,
    }


# ── Scoring contre les 7 marketplaces ────────────────────────────────────────

def score_seller(name: str, domain: str, profile: dict) -> dict:
    seller_data = {
        "categories": [profile["category"]],
        "price_range": profile["price"],
        "country": profile["country"],
        "avg_product_count": 50,  # valeur neutre par défaut
        "distribution_type": "mono-brand",  # DTC → mono-brand par défaut
    }

    mp_scores = {}
    for mp_key in MARKETPLACE_PROFILES:
        score, detail = score_seller_for_marketplace(seller_data, mp_key)
        mp_scores[mp_key] = {"score": score, "detail": detail}

    best_mp = max(mp_scores, key=lambda k: mp_scores[k]["score"])
    best_score = mp_scores[best_mp]["score"]

    if best_score >= 70:
        priority = "HIGH"
    elif best_score >= 50:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    return {
        "mp_scores": mp_scores,
        "best_marketplace": best_mp,
        "best_score": best_score,
        "priority": priority,
    }


# ── Export Supabase ───────────────────────────────────────────────────────────

MP_IDS = {
    "zalando": "0c19bfab-66a9-406e-b609-4af8b9bcf098",
    "laredoute": "7bb79fa4-0ee7-406d-af81-9610d4b842d4",
    "galeries_lafayette": "1518fd76-85c0-4e7c-9a0c-fe4deb4818dd",
    "john_lewis": "f08afd75-ad5d-45da-8387-7e5eea7e4d71",
    "debenhams": "7afbbb07-b2c4-4fd0-8f0b-f326de14aca6",
    "bloomingdales": "e528ca09-6fc5-4c6d-a087-16ee6bb5b22a",
    "nordstrom": "7c559fa5-27a1-491d-8be7-323b9410e6e3",
}

CATEGORY_IDS = {
    "fashion": "07e4db91-21cf-4086-b770-8051f6ab0575",
    "beauty": "94843ac4-2424-485b-bf13-99ff834f3972",
    "footwear": "02a1611d-42a6-4eac-a2bd-1e3e8666962c",
    "accessories": "97a218ad-c733-410b-adb1-11d4c95fa3bd",
    "sports": "1c56e7a8-1f52-4c66-b7dc-860bb9d8472b",
    "kids": "22e4cbbb-f002-44d0-98f5-311c04d5da88",
    "luxury": "d865d960-e14f-4922-a237-aa5d14aeb77e",
    "home": "2a5c8a92-486b-4598-98fe-aa3444175a13",
}

COUNTRY_IDS = {
    "FR": "65778f1d-0a75-4399-88ee-cad4a0f623ca",
    "DE": "fe3bb5d8-e260-43f4-bfdf-9a635b053cef",
    "IT": "cb23aa0e-dab4-41ac-88e9-cf3f4171d7f0",
    "ES": "611d932d-2a34-4312-811c-964f70c732fe",
    "NL": "6f764464-5658-497d-b413-fc5f888164ea",
    "BE": "676d0b54-39a8-44eb-8a5c-055fe1987518",
    "UK": "5438ac59-684c-4edd-bba9-ba85dccbe459",
    "US": "a6f06ddb-397e-422a-91a2-4af2c08ce43d",
    "SE": "f24fd9a5-ef1f-4b0f-8620-6450e5c56125",
    "DK": "926e22ca-a2d2-44e0-aa1d-d42a5dc6f00d",
}

PRICE_IDS = {
    "budget": "960c2c5d-8f4a-4f95-95f0-a20c55cf2f54",
    "mid": "fa0c916c-df9c-4b89-ad0c-a0b5c458f24b",
    "premium": "e67b5944-279e-40b8-a687-00bf3720360f",
    "luxury": "67147d6b-a8af-4e6d-9706-bf2f22e2006d",
}


def upsert_to_supabase(name: str, domain: str, profile: dict, scoring: dict) -> Optional[str]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  [!] Supabase non configuré", file=sys.stderr)
        return None
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        rationale_parts = []
        for mp_key in sorted(scoring["mp_scores"], key=lambda k: scoring["mp_scores"][k]["score"], reverse=True):
            mp_name = MARKETPLACE_PROFILES[mp_key]["name"]
            s = scoring["mp_scores"][mp_key]["score"]
            rationale_parts.append(f"{mp_name}: {s}")
        rationale = " | ".join(rationale_parts)

        row = {
            "seller_name": name,
            "company_domain": domain or None,
            "category_id": CATEGORY_IDS.get(profile["category"], CATEGORY_IDS["fashion"]),
            "country_id": COUNTRY_IDS.get(profile["country"], COUNTRY_IDS["US"]),
            "price_category_id": PRICE_IDS.get(profile["price"], PRICE_IDS["mid"]),
            "match_score": scoring["best_score"],
            "top_match_marketplace_id": MP_IDS.get(scoring["best_marketplace"]),
            "match_rationale": rationale,
            "status": "scraped",
        }

        # Upsert by seller_name
        existing = client.table("sellers").select("id").eq("seller_name", name).execute()
        if existing.data:
            seller_id = existing.data[0]["id"]
            client.table("sellers").update(row).eq("id", seller_id).execute()
            print(f"  Updated seller {name} in Supabase (id={seller_id})", file=sys.stderr)
        else:
            res = client.table("sellers").insert(row).execute()
            seller_id = res.data[0]["id"] if res.data else None
            print(f"  Inserted seller {name} in Supabase (id={seller_id})", file=sys.stderr)

        return seller_id
    except Exception as e:
        print(f"  [!] Supabase error: {e}", file=sys.stderr)
        return None


# ── Build recommendations (format compatible app Next.js) ────────────────────

def build_recommendations(scoring: dict) -> list:
    recs = []
    for mp_key, mp_data in sorted(
        scoring["mp_scores"].items(),
        key=lambda x: x[1]["score"],
        reverse=True,
    ):
        mp_profile = MARKETPLACE_PROFILES[mp_key]
        score = mp_data["score"]
        detail = mp_data["detail"]

        if score >= 70:
            priority = "HIGH"
        elif score >= 88:
            priority = "HOT"
        elif score >= 50:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        why = []
        if detail.get("category_fit", 0) >= 80:
            why.append(f"Catégorie très alignée ({detail['category_fit']:.0f}/100)")
        if detail.get("geography_fit", 0) >= 80:
            why.append(f"Géographie cible ({detail['geography_fit']:.0f}/100)")
        if detail.get("price_fit", 0) >= 80:
            why.append(f"Prix compatible ({detail['price_fit']:.0f}/100)")

        cautions = []
        if detail.get("category_fit", 100) < 50:
            cautions.append("Catégorie peu dans le cœur de cible")
        if detail.get("geography_fit", 100) < 50:
            cautions.append("Géographie secondaire pour cet opérateur")

        recs.append({
            "marketplaceId": MP_IDS.get(mp_key, mp_key),
            "marketplaceName": mp_profile["name"],
            "score": round(score),
            "priority": priority,
            "region": "US" if mp_profile.get("preferred_countries", [""])[0] == "US" else "Europe",
            "heroStat": f"{round(score)}/100 fit score",
            "whyItMatches": why if why else ["Profil compatible avec les critères opérateur"],
            "cautions": cautions if cautions else ["Enrichissement contact à compléter"],
            "matchingSignals": [
                f"Category fit : {detail.get('category_fit', 0):.0f}/100",
                f"Price fit : {detail.get('price_fit', 0):.0f}/100",
                f"Geography fit : {detail.get('geography_fit', 0):.0f}/100",
            ],
            "rolesToScrape": ["Head of Marketplace", "E-commerce Director"],
            "criteria": [
                {"key": "category", "label": "Catégorie", "weight": 30,
                 "score": round(detail.get("category_fit", 0)), "weightedScore": round(detail.get("category_fit", 0) * 0.3, 1), "reason": ""},
                {"key": "geography", "label": "Géo", "weight": 25,
                 "score": round(detail.get("geography_fit", 0)), "weightedScore": round(detail.get("geography_fit", 0) * 0.25, 1), "reason": ""},
                {"key": "price", "label": "Prix", "weight": 25,
                 "score": round(detail.get("price_fit", 0)), "weightedScore": round(detail.get("price_fit", 0) * 0.25, 1), "reason": ""},
            ],
        })
    return recs


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--domain", default="")
    # Pre-classified values from the Next.js /api/scrape-seller route (OpenAI).
    # When provided, the DDG regex profiling is skipped entirely — these values
    # are authoritative and the brand is guaranteed to be in scope.
    parser.add_argument("--category", default="", help="Pre-classified category (fashion/beauty/...)")
    parser.add_argument("--price", default="", help="Pre-classified price band (budget/mid/premium/luxury)")
    parser.add_argument("--country", default="", help="Pre-classified country (FR/US/...)")
    args = parser.parse_args()

    name = args.name.strip()
    domain = args.domain.strip().lstrip("https://").lstrip("http://").lstrip("www.")

    print(f"\n=== scrape_one: {name} ({domain}) ===", file=sys.stderr)

    # If the caller pre-classified the brand, use that directly (trust the LLM).
    if args.category:
        profile = {
            "category": args.category,
            "price": args.price or "mid",
            "country": args.country or infer_country(domain),
            "in_scope": True,
            "source": "pre-classified",
        }
        print(
            f"  Using pre-classified profile: category={profile['category']}, "
            f"price={profile['price']}, country={profile['country']}",
            file=sys.stderr,
        )
    else:
        # Standalone / legacy path: fall back to DDG regex profiling.
        profile = profile_brand(name, domain)

    # If the brand is out of Mirakl Fashion scope, short-circuit: no scoring, no DB write,
    # no marketplace recommendations. The UI shows an "out of scope" state instead.
    if not profile.get("in_scope", False):
        output = {
            "sellerProfile": {
                "category": None,
                "country": profile.get("country"),
                "price": None,
            },
            "recommendations": [],
            "sellerId": None,
            "source": "scraping",
            "outOfScope": True,
            "reason": profile.get("reason", "Marque hors scope Mirakl Fashion."),
            "message": f"{name} n'entre pas dans l'univers Mirakl Fashion (mode, beaute, accessoires, sport, luxe).",
        }
        print(json.dumps(output))
        return

    scoring = score_seller(name, domain, profile)
    seller_id = upsert_to_supabase(name, domain, profile, scoring)
    recommendations = build_recommendations(scoring)

    output = {
        "sellerProfile": {
            "category": profile["category"],
            "country": profile["country"],
            "price": profile["price"],
        },
        "recommendations": recommendations,
        "sellerId": seller_id,
        "source": "scraping",
        "outOfScope": False,
        "message": f"Seller {name} score et insere en Supabase.",
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
