import re
import json
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


class JohnLewisScraper(BaseScraper):
    marketplace_key = "john_lewis"
    marketplace_name = "John Lewis"

    def get_brands_url(self) -> str:
        return MARKETPLACES["john_lewis"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Parse John Lewis /brands — extract from __NEXT_DATA__ JSON."""
        soup = BeautifulSoup(html, "html.parser")
        brands = []
        base = MARKETPLACES["john_lewis"]["base_url"]

        # John Lewis stores brands in __NEXT_DATA__ under props.pageProps.brands
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data:
            try:
                data = json.loads(next_data.string)
                brands_dict = data.get("props", {}).get("pageProps", {}).get("brands", {})
                for letter, brand_list in brands_dict.items():
                    for brand in brand_list:
                        name = brand.get("label", "")
                        nav = brand.get("navigationState", "")
                        count = int(brand.get("count", 0))
                        if name and nav:
                            brands.append({
                                "name": name,
                                "url": base + nav,
                                "product_count": count,
                            })
            except (json.JSONDecodeError, TypeError, KeyError):
                pass

        if not brands:
            # Fallback: parse links
            for link in soup.find_all("a", href=True):
                href = link["href"]
                name = link.get_text(strip=True)
                if name and "/brand/" in href:
                    full_url = href if href.startswith("http") else base + href
                    brands.append({"name": name, "url": full_url})

        return brands

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        """For John Lewis, we already have product count from listing."""
        # Product count already extracted from brands page
        product_count = brand_info.get("product_count", 0)

        # Determine categories from brand name heuristics
        categories = []
        name_lower = brand_info["name"].lower()
        for mirakl_cat, keywords in MIRAKL_CATEGORIES.items():
            if any(kw in name_lower for kw in keywords):
                categories.append(mirakl_cat)

        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=categories or ["fashion"],
            price_range="mid",  # JL is mid-to-premium
            product_count=product_count,
            country="UK",
            distribution_type="mono-brand",
        )

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Override run: John Lewis gives us everything from the brands page."""
        print(f"\n{'='*60}")
        print(f"  Scraping {self.marketplace_name}...")
        print(f"{'='*60}")

        html = self.fetch(self.get_brands_url())
        if not html:
            print(f"  [X] Could not fetch brands page for {self.marketplace_name}")
            return []

        brands = self.parse_brands(html)
        print(f"  Found {len(brands)} brands on {self.marketplace_name}")

        # We already have product counts, no need to fetch each brand page
        brands = brands[:max_brands]

        for brand in brands:
            seller = self.parse_brand_detail("", brand)
            if seller:
                self.sellers.append(seller)

        print(f"  Total: {len(self.sellers)} sellers from {self.marketplace_name}")
        return self.sellers
