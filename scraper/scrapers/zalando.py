import re
import json
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


class ZalandoScraper(BaseScraper):
    marketplace_key = "zalando"
    marketplace_name = "Zalando"

    def get_brands_url(self) -> str:
        return MARKETPLACES["zalando"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Parse Zalando /marques/ — extract brands from embedded JSON data."""
        brands = []

        # Zalando embeds brand data as JSON in a large script tag
        # Pattern: "name":"BrandName","uri":"https://www.zalando.fr/brand-slug/"
        brand_pattern = re.compile(r'"name":"([^"]+)","uri":"(https://www\.zalando\.fr/[^"]+/)"')
        matches = brand_pattern.findall(html)

        for name, url in matches:
            # Decode unicode escapes like \u0026
            name = name.encode().decode("unicode_escape")
            brands.append({"name": name, "url": url})

        # Deduplicate by URL (same brand can appear multiple times)
        seen = set()
        unique = []
        for b in brands:
            if b["url"] not in seen:
                seen.add(b["url"])
                unique.append(b)

        return unique

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        """Parse a Zalando brand page to extract product info."""
        soup = BeautifulSoup(html, "html.parser")

        product_count = 0
        categories = []
        prices = []

        # Look for result count — Zalando shows "X articles" or in JSON
        count_match = re.search(r'"totalCount":(\d+)', html)
        if count_match:
            product_count = int(count_match.group(1))
        else:
            count_match = re.search(r"(\d[\d\s]*)\s*(?:article|résultat|product|item)", html, re.IGNORECASE)
            if count_match:
                product_count = int(count_match.group(1).replace(" ", "").replace("\xa0", ""))

        # Try JSON-LD for structured data
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if "numberOfItems" in data:
                        product_count = max(product_count, data["numberOfItems"])
                    if "itemListElement" in data:
                        product_count = max(product_count, len(data["itemListElement"]))
            except (json.JSONDecodeError, TypeError):
                pass

        # Extract prices from product cards
        price_pattern = re.compile(r"(\d+[.,]\d{2})\s*€")
        for match in price_pattern.finditer(html):
            try:
                price = float(match.group(1).replace(",", "."))
                if 1 < price < 5000:
                    prices.append(price)
            except ValueError:
                pass

        # Determine price range
        price_range = ""
        if prices:
            avg = sum(prices) / len(prices)
            if avg < 30:
                price_range = "budget"
            elif avg < 100:
                price_range = "mid"
            elif avg < 300:
                price_range = "premium"
            else:
                price_range = "luxury"

        # Categorize from page content
        text = html.lower()
        for mirakl_cat, keywords in MIRAKL_CATEGORIES.items():
            if any(kw in text for kw in keywords):
                if mirakl_cat not in categories:
                    categories.append(mirakl_cat)

        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=categories or ["fashion"],
            price_range=price_range,
            product_count=product_count,
            country="EU",
            distribution_type="mono-brand",
        )
