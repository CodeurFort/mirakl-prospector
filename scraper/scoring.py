"""
Scoring engine — computes a match score per (seller × marketplace) pair.

Each of the 7 marketplaces has a profile (preferred categories, price range,
geography). A seller gets 7 scores; the best one determines top_match_marketplace.
"""
from typing import List, Dict, Tuple
from config import (
    SCORING_WEIGHTS, SCORE_HIGH, SCORE_MEDIUM,
    MARKETPLACE_PROFILES, MIRAKL_CATEGORIES, MARKETPLACE_TRENDS,
)
from models import Seller, ScoredSeller
from verification import check_marketplace_presence


def score_category_fit(seller_categories: List[str], mp_preferred: List[str]) -> float:
    """Score 0-100: how well do the seller's categories match this marketplace."""
    if not seller_categories:
        return 0

    best = 0
    for cat in seller_categories:
        cat_lower = cat.lower()
        if cat_lower in mp_preferred:
            best = max(best, 100)
        else:
            # Partial match via keywords
            for mp_cat in mp_preferred:
                kw_list = MIRAKL_CATEGORIES.get(mp_cat, [])
                if any(kw in cat_lower for kw in kw_list):
                    best = max(best, 60)
                    break
            else:
                best = max(best, 20)
    return best


def score_price_fit(seller_price: str, mp_profile: Dict) -> float:
    """Score 0-100: how well does the seller's price range fit this marketplace."""
    if not seller_price:
        return 30
    if seller_price in mp_profile.get("preferred_prices", []):
        return 100
    if seller_price in mp_profile.get("accepted_prices", []):
        return 60
    return 20


def score_geography_fit(seller_country: str, mp_profile: Dict) -> float:
    """Score 0-100: geographic fit between seller origin and marketplace target."""
    if not seller_country:
        return 30
    if seller_country in mp_profile.get("preferred_countries", []):
        return 100
    if seller_country in mp_profile.get("accepted_countries", []):
        return 60
    return 20


def score_catalog_depth(product_count: int) -> float:
    """Score 0-100 based on catalog size."""
    if product_count >= 500:
        return 100
    elif product_count >= 200:
        return 75
    elif product_count >= 50:
        return 50
    elif product_count >= 10:
        return 25
    return 10  # Unknown or very small


def score_distribution_type(dist_type: str) -> float:
    """Score 0-100. Mono-brand = more interesting for Mirakl Connect."""
    if dist_type == "mono-brand":
        return 90
    elif dist_type == "multi-brand":
        return 70
    return 50


def score_seller_for_marketplace(seller_data: Dict, mp_key: str) -> Tuple[float, Dict]:
    """Compute match score for one (seller × marketplace) pair.

    Returns (total_score, detail_scores).
    """
    mp_profile = MARKETPLACE_PROFILES[mp_key]
    w = SCORING_WEIGHTS

    s_cat = score_category_fit(
        seller_data["categories"],
        mp_profile["preferred_categories"],
    )
    s_price = score_price_fit(seller_data["price_range"], mp_profile)
    s_geo = score_geography_fit(seller_data["country"], mp_profile)
    s_catalog = score_catalog_depth(seller_data["avg_product_count"])
    s_dist = score_distribution_type(seller_data["distribution_type"])

    total = (
        s_cat * w["category_fit"]
        + s_price * w["price_fit"]
        + s_geo * w["geography_fit"]
        + s_catalog * w["catalog_depth"]
        + s_dist * w["distribution_type"]
    )
    # --- Trend boost: reward sellers in categories a marketplace is expanding into ---
    trend_boost = 0
    trends = MARKETPLACE_TRENDS.get(mp_key, {})
    expanding = trends.get("expanding_into", [])
    if expanding:
        for cat in seller_data["categories"]:
            if cat.lower() in expanding:
                trend_boost = trends.get("trend_boost", 0)
                break
    total = total + trend_boost
    total = min(100, total)

    detail = {
        "category_fit": s_cat,
        "price_fit": s_price,
        "geography_fit": s_geo,
        "catalog_depth": s_catalog,
        "distribution_type": s_dist,
        "trend_boost": trend_boost,
        "total": round(total, 1),
    }
    return round(total, 1), detail


def merge_and_score(
    all_sellers: List[Seller],
    marketplace_brands: Dict[str, set] = None,
) -> List[ScoredSeller]:
    """Merge sellers by name, then score against all 7 marketplaces.

    If marketplace_brands is provided, exclude seller from marketplaces
    where they are already present (per-marketplace exclusion).
    """
    if marketplace_brands is None:
        marketplace_brands = {}

    # --- Group by normalized name ---
    groups: Dict[str, List[Seller]] = {}
    for seller in all_sellers:
        key = seller.name.strip().lower()
        if not key:
            continue
        if key not in groups:
            groups[key] = []
        groups[key].append(seller)

    results: List[ScoredSeller] = []

    for name_key, sellers in groups.items():
        # --- Merge data from all sources ---
        all_categories = []
        all_sources = []
        brand_urls = {}
        total_products = 0
        total_rating = 0.0
        rating_count = 0
        countries = []
        price_ranges = []
        dist_types = []

        for s in sellers:
            all_sources.append(s.marketplace_source)
            brand_urls[s.marketplace_source] = s.brand_url
            all_categories.extend(s.categories)
            total_products += s.product_count
            if s.rating > 0:
                total_rating += s.rating
                rating_count += 1
            if s.country:
                countries.append(s.country)
            if s.price_range:
                price_ranges.append(s.price_range)
            if s.distribution_type:
                dist_types.append(s.distribution_type)

        categories = list(set(all_categories))
        avg_products = total_products // max(len(sellers), 1)
        avg_rating = total_rating / max(rating_count, 1)
        country = max(set(countries), key=countries.count) if countries else ""
        price_range = max(set(price_ranges), key=price_ranges.count) if price_ranges else ""
        dist_type = max(set(dist_types), key=dist_types.count) if dist_types else ""
        # Pick the first non-empty company_domain
        company_domain = ""
        for s in sellers:
            if s.company_domain:
                company_domain = s.company_domain
                break

        seller_data = {
            "categories": categories,
            "price_range": price_range,
            "country": country,
            "avg_product_count": avg_products,
            "distribution_type": dist_type,
        }

        # --- Per-marketplace exclusion (double-vérification) ---
        present_on = check_marketplace_presence(
            seller_name=sellers[0].name,
            seller_domain=company_domain,
            marketplace_brands=marketplace_brands,
        )

        # --- Score against each marketplace (excluding where present) ---
        mp_scores = {}
        for mp_key in MARKETPLACE_PROFILES:
            if mp_key in present_on:
                continue  # skip — already on this marketplace
            score, detail = score_seller_for_marketplace(seller_data, mp_key)
            mp_scores[mp_key] = {"score": score, "detail": detail}

        # No eligible marketplace — skip entirely
        if not mp_scores:
            continue

        # --- Find best marketplace match ---
        best_mp = max(mp_scores, key=lambda k: mp_scores[k]["score"])
        best_score = mp_scores[best_mp]["score"]

        # --- Build rationale ---
        rationale_parts = []
        for mp_key in sorted(mp_scores, key=lambda k: mp_scores[k]["score"], reverse=True):
            mp_name = MARKETPLACE_PROFILES[mp_key]["name"]
            s = mp_scores[mp_key]["score"]
            rationale_parts.append(f"{mp_name}: {s}")
        if present_on:
            present_names = [MARKETPLACE_PROFILES.get(k, {}).get("name", k) for k in present_on]
            rationale_parts.append(f"Already on: {', '.join(present_names)}")
        rationale = " | ".join(rationale_parts)

        # --- Priority ---
        if best_score >= SCORE_HIGH:
            priority = "HIGH"
        elif best_score >= SCORE_MEDIUM:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        # --- Build ScoredSeller ---
        scored = ScoredSeller(
            name=sellers[0].name,
            marketplaces=list(set(all_sources)),
            brand_urls=brand_urls,
            company_domain=company_domain,
            categories=categories,
            price_range=price_range,
            avg_product_count=avg_products,
            country=country,
            distribution_type=dist_type,
            avg_rating=round(avg_rating, 1),
            # Store best marketplace scores in the individual score fields
            score_category=mp_scores[best_mp]["detail"]["category_fit"],
            score_price=mp_scores[best_mp]["detail"]["price_fit"],
            score_catalog=mp_scores[best_mp]["detail"]["catalog_depth"],
            score_multi_marketplace=float(len(mp_scores)),  # number of eligible marketplaces
            score_geography=mp_scores[best_mp]["detail"]["geography_fit"],
            score_distribution=mp_scores[best_mp]["detail"]["distribution_type"],
            total_score=best_score,
            priority=priority,
        )
        # Store extra data for export
        scored._best_marketplace = best_mp
        scored._mp_scores = mp_scores
        scored._present_on = present_on
        scored._rationale = rationale

        results.append(scored)

    results.sort(key=lambda x: x.total_score, reverse=True)
    return results
