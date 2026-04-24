import re
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


class DebenhamsScraper(BaseScraper):
    marketplace_key = "debenhams"
    marketplace_name = "Debenhams"

    def get_brands_url(self) -> str:
        return MARKETPLACES["debenhams"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Parse Debenhams marketplace brands — extract from category links."""
        soup = BeautifulSoup(html, "html.parser")
        brands = []
        base = MARKETPLACES["debenhams"]["base_url"]

        # Debenhams has brand links as /categories/*-brands-BRANDNAME
        for link in soup.find_all("a", href=True):
            href = link["href"]
            name = link.get_text(strip=True)

            if not name or len(name) < 2:
                continue

            if "-brands-" in href and "/categories/" in href:
                # Extract brand slug from URL
                brand_slug = href.split("-brands-")[-1]
                # Skip non-brand links (offer, sale, etc.)
                if any(x in brand_slug for x in ["offer", "sale", "selected"]):
                    continue

                full_url = href if href.startswith("http") else base + href

                # Determine category from URL prefix
                category = ""
                if "beauty-brands" in href:
                    category = "beauty"
                elif "fashion-brands" in href or "womens-brands" in href or "mens-brands" in href:
                    category = "fashion"
                elif "kids-brands" in href:
                    category = "kids"
                elif "sport-brands" in href:
                    category = "sports"
                elif "accessories-brands" in href:
                    category = "accessories"
                elif "shoes-brands" in href or "footwear-brands" in href:
                    category = "footwear"

                brands.append({
                    "name": name,
                    "url": full_url,
                    "categories": [category] if category else [],
                })

        # Deduplicate by name (same brand in multiple categories)
        seen = {}
        for b in brands:
            key = b["name"].lower()
            if key in seen:
                # Merge categories
                existing = seen[key]
                for cat in b.get("categories", []):
                    if cat and cat not in existing.get("categories", []):
                        existing.setdefault("categories", []).append(cat)
            else:
                seen[key] = b

        return list(seen.values())

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        """Create Seller from brand listing data (no detail page needed)."""
        categories = brand_info.get("categories", [])

        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=categories or ["fashion"],
            price_range="mid",
            product_count=0,
            country="UK",
            distribution_type="mono-brand",
        )

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Override run: Debenhams gives us brand data from the listing page."""
        print(f"\n{'='*60}")
        print(f"  Scraping {self.marketplace_name}...")
        print(f"{'='*60}")

        html = self.fetch(self.get_brands_url())
        if not html:
            print(f"  [X] Could not fetch brands page for {self.marketplace_name}")
            return []

        brands = self.parse_brands(html)
        print(f"  Found {len(brands)} brands on {self.marketplace_name}")

        brands = brands[:max_brands]

        for brand in brands:
            seller = self.parse_brand_detail("", brand)
            if seller:
                self.sellers.append(seller)

        print(f"  Total: {len(self.sellers)} sellers from {self.marketplace_name}")
        return self.sellers
