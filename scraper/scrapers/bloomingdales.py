import re
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


# Curated list — Bloomingdales blocks automated requests (Cloudflare)
BLOOMINGDALES_MARKETPLACE_BRANDS = [
    "Ralph Lauren", "Calvin Klein", "Michael Kors", "Marc Jacobs", "Tory Burch",
    "Coach", "Kate Spade", "Vince", "Theory", "AllSaints",
    "Ted Baker", "Reiss", "Hugo Boss", "Tommy Hilfiger",
    "Free People", "Madewell", "Reformation", "Good American",
    "AG Jeans", "Frame", "Paige", "DL1961", "Citizens of Humanity",
    "Stuart Weitzman", "Cole Haan", "Sam Edelman", "Steve Madden",
    "Aqua", "BCBGMAXAZRIA", "Bloomingdale's", "Karen Millen",
    "Clinique", "Estee Lauder", "MAC Cosmetics", "Bobbi Brown",
    "Jo Malone", "Tom Ford Beauty", "La Mer", "Kiehl's",
    "Charlotte Tilbury", "Fresh", "Origins", "Lancome",
    "Nike", "Adidas", "New Balance", "Veja", "On Running",
    "Canada Goose", "The North Face", "Moncler", "Barbour",
]


class BloomingdalesScraper(BaseScraper):
    marketplace_key = "bloomingdales"
    marketplace_name = "Bloomingdales"

    def get_brands_url(self) -> str:
        return MARKETPLACES["bloomingdales"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Bloomingdales blocks scraping — use curated brand list."""
        print("  [!] Bloomingdales blocks automated access, using curated brand list")
        base = MARKETPLACES["bloomingdales"]["base_url"]

        brands = []
        for name in BLOOMINGDALES_MARKETPLACE_BRANDS:
            slug = name.lower().replace(" ", "-").replace("'", "").replace("&", "and")
            brands.append({
                "name": name,
                "url": f"{base}/shop/brand/{slug}",
            })
        return brands

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=["fashion", "luxury"],
            price_range="premium",
            product_count=0,
            country="US",
            distribution_type="mono-brand",
        )

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Use curated list."""
        print(f"\n{'='*60}")
        print(f"  Scraping {self.marketplace_name}...")
        print(f"{'='*60}")

        brands = self.parse_brands("")
        print(f"  Found {len(brands)} brands on {self.marketplace_name}")

        brands = brands[:max_brands]

        for brand in brands:
            seller = self.parse_brand_detail("", brand)
            if seller:
                self.sellers.append(seller)

        print(f"  Total: {len(self.sellers)} sellers from {self.marketplace_name}")
        return self.sellers
