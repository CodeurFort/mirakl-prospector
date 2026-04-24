import os
import time
from typing import List, Optional
from curl_cffi import requests as cffi_requests

from models import Seller
from config import MIRAKL_CATEGORIES
from .base import BaseSource


# Apify actor for Amazon FR sellers
APIFY_ACTOR = "xmiso_scrapers/amazon-france-sellers-leads-scraper"
APIFY_BASE = "https://api.apify.com/v2"

# Amazon categories to scrape (matching Mirakl Connect targets)
AMAZON_CATEGORIES = [
    {"amazon_category": "fashion-mens", "keyword": "streetwear", "mirakl_cat": "fashion"},
    {"amazon_category": "fashion-womens", "keyword": "", "mirakl_cat": "fashion"},
    {"amazon_category": "fashion-mens", "keyword": "chaussures", "mirakl_cat": "footwear"},
    {"amazon_category": "beauty", "keyword": "soins visage", "mirakl_cat": "beauty"},
    {"amazon_category": "beauty", "keyword": "maquillage", "mirakl_cat": "beauty"},
    {"amazon_category": "sporting", "keyword": "sneakers", "mirakl_cat": "sports"},
    {"amazon_category": "fashion-luggage", "keyword": "sac a main", "mirakl_cat": "accessories"},
    {"amazon_category": "fashion-baby", "keyword": "", "mirakl_cat": "kids"},
]

EU_COUNTRIES = ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "PL", "SE", "DK", "FI", "IE", "PT", "CZ", "GB"]


class AmazonFRSource(BaseSource):
    source_name = "amazon_fr"

    def __init__(self):
        self.api_token = os.getenv("APIFY_TOKEN", "")

    def discover(self, max_results: int = 100) -> List[Seller]:
        """Discover sellers from Amazon FR via Apify."""
        print(f"\n{'='*60}")
        print(f"  Sourcing candidates from Amazon FR (Apify)...")
        print(f"{'='*60}")

        if not self.api_token:
            print("  [!] APIFY_TOKEN not set in .env — skipping Amazon FR")
            print("      Add APIFY_TOKEN=apify_api_xxxxx to .env")
            return []

        candidates = []
        session = cffi_requests.Session(impersonate="chrome110")

        for cat_config in AMAZON_CATEGORIES:
            if len(candidates) >= max_results:
                break

            cat_name = cat_config["amazon_category"]
            keyword = cat_config["keyword"]
            mirakl_cat = cat_config["mirakl_cat"]

            print(f"\n  Scraping Amazon FR: {cat_name} / {keyword or '(all)'}...", end=" ")

            # Run Apify actor
            run_data = self._run_actor(session, cat_config, max_results=30)
            if not run_data:
                print("FAILED")
                continue

            # Filter EU sellers
            eu_sellers = [s for s in run_data if s.get("country_code", "") in EU_COUNTRIES]
            # Exclude Amazon itself
            eu_sellers = [s for s in eu_sellers if "amazon" not in (s.get("business_name", "") or "").lower()]
            # Min rating
            eu_sellers = [s for s in eu_sellers if (s.get("rating_lifetime") or 0) >= 3.5]
            # Must have contact
            eu_sellers = [s for s in eu_sellers if s.get("email") or s.get("phone_number")]

            print(f"{len(eu_sellers)} EU sellers found")

            for s in eu_sellers:
                seller = Seller(
                    name=s.get("business_name", ""),
                    marketplace_source="amazon_fr",
                    brand_url=s.get("seller_page_url", ""),
                    categories=[mirakl_cat],
                    country=s.get("country_code", ""),
                    rating=s.get("rating_lifetime", 0),
                    distribution_type="mono-brand",
                    description=f"Amazon FR seller. Product: {s.get('product_name', '')}",
                )
                candidates.append(seller)

            time.sleep(2)

        print(f"\n  Total candidates from Amazon FR: {len(candidates)}")
        return candidates

    def _run_actor(self, session, cat_config: dict, max_results: int = 30) -> Optional[List[dict]]:
        """Run Apify actor and return dataset items."""
        try:
            # Start actor run
            run_url = f"{APIFY_BASE}/acts/{APIFY_ACTOR}/runs?token={self.api_token}&waitForFinish=300"
            payload = {
                "amazon_category": cat_config["amazon_category"],
                "keyword": cat_config.get("keyword", ""),
                "max_results": max_results,
            }

            resp = session.post(run_url, json=payload, timeout=300)
            if resp.status_code != 201:
                print(f"[Apify error {resp.status_code}]", end=" ")
                return None

            run_data = resp.json().get("data", {})
            dataset_id = run_data.get("defaultDatasetId")
            if not dataset_id:
                return None

            # Get dataset items
            time.sleep(2)
            items_url = f"{APIFY_BASE}/datasets/{dataset_id}/items?token={self.api_token}"
            items_resp = session.get(items_url, timeout=30)
            if items_resp.status_code == 200:
                return items_resp.json()

            return None

        except Exception as e:
            print(f"[Error: {e}]", end=" ")
            return None
