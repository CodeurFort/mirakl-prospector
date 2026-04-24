"""
Amazon presence checker — verifies if a brand sells on Amazon FR.
Uses DuckDuckGo search with site:amazon.fr to avoid bot detection.
"""
import time
from typing import List, Tuple
from duckduckgo_search import DDGS


def check_amazon_presence(brand_names: List[str], delay: float = 1.5) -> dict:
    """Check Amazon FR presence for a list of brand names.

    Uses DuckDuckGo 'site:amazon.fr "brand name"' to check presence
    without hitting Amazon directly (avoids bot detection).

    Returns {brand_name_lower: (is_present: bool, product_count: int)}
    """
    results = {}

    print(f"\n  Vérification Amazon FR pour {len(brand_names)} marques...")

    for i, name in enumerate(brand_names):
        name_lower = name.strip().lower()
        if name_lower in results:
            continue

        try:
            query = f'amazon.fr {name}'
            with DDGS() as ddgs:
                search_results = list(ddgs.text(query, max_results=5, region="fr-fr"))

            # Count how many results are actual Amazon product/search pages
            amazon_hits = 0
            for r in search_results:
                href = r.get("href", "").lower()
                title = r.get("title", "").lower()
                if "amazon.fr" in href:
                    amazon_hits += 1

            is_present = amazon_hits >= 1
            results[name_lower] = (is_present, amazon_hits)

            # Progress every 10 brands
            if (i + 1) % 10 == 0 or i == len(brand_names) - 1:
                present = sum(1 for v in results.values() if v[0])
                print(f"    {i+1}/{len(brand_names)} vérifié(s) — {present} trouvé(s) sur Amazon")

            time.sleep(delay)

        except Exception as e:
            results[name_lower] = (False, 0)
            if (i + 1) % 10 == 0:
                print(f"    {i+1}/{len(brand_names)} (erreur: {e})")
            time.sleep(delay * 2)

    present = sum(1 for v in results.values() if v[0])
    print(f"  Amazon FR: {present}/{len(results)} marques présentes")
    return results
