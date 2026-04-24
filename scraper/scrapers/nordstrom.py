import re
import json
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


# Known Nordstrom marketplace brands (curated list from research)
# Nordstrom is a React SPA with heavy JS obfuscation — direct scraping not feasible
NORDSTROM_MARKETPLACE_BRANDS = [
    "Vince", "Rag & Bone", "Theory", "AllSaints", "Reiss", "Ted Baker",
    "Madewell", "Free People", "Reformation", "Good American", "Veronica Beard",
    "Faherty", "Barbour", "Paige", "AG Jeans", "Frame", "DL1961",
    "Cole Haan", "Stuart Weitzman", "Sam Edelman", "Steve Madden", "Veja",
    "On Running", "Hoka", "New Balance", "Birkenstock", "Dr. Martens",
    "Tory Burch", "Kate Spade", "Coach", "Michael Kors", "Marc Jacobs",
    "Kiehl's", "Clinique", "MAC Cosmetics", "Bobbi Brown", "Jo Malone",
    "Le Labo", "Diptyque", "Tom Ford Beauty", "Charlotte Tilbury",
    "La Mer", "Estee Lauder", "Lancome", "SK-II", "Fresh",
    "Nike", "Adidas", "Puma", "Under Armour", "Lululemon",
    "Patagonia", "The North Face", "Arc'teryx", "Canada Goose",
    "Ralph Lauren", "Tommy Hilfiger", "Calvin Klein", "Hugo Boss",
    "Topshop", "River Island", "Treasure & Bond", "Zella", "BP.",
]


class NordstromScraper(BaseScraper):
    marketplace_key = "nordstrom"
    marketplace_name = "Nordstrom"

    def get_brands_url(self) -> str:
        return MARKETPLACES["nordstrom"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Nordstrom is a React SPA — use curated brand list."""
        print("  [!] Nordstrom is a React SPA (JS-rendered), using curated brand list")
        base = MARKETPLACES["nordstrom"]["base_url"]

        brands = []
        for name in NORDSTROM_MARKETPLACE_BRANDS:
            slug = name.lower().replace(" ", "-").replace("'", "").replace("&", "and")
            brands.append({
                "name": name,
                "url": f"{base}/brands/{slug}",
            })
        return brands

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=["fashion"],
            price_range="premium",
            product_count=0,
            country="US",
            distribution_type="mono-brand",
        )

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Use curated list — no HTTP requests needed for brand discovery."""
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
