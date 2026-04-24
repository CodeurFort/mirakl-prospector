import re
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


# Curated list — Galeries Lafayette is a curated marketplace with ~70+ brands
GALERIES_MARKETPLACE_BRANDS = [
    "Sandro", "Maje", "Claudie Pierlot", "Ba&sh", "Zadig & Voltaire",
    "The Kooples", "IRO", "Isabel Marant", "Ami Paris", "Jacquemus",
    "Kenzo", "Lanvin", "Balmain", "Givenchy", "Celine",
    "Saint Laurent", "Gucci", "Prada", "Balenciaga", "Bottega Veneta",
    "Dior", "Chanel", "Louis Vuitton", "Hermes", "Valentino",
    "Longchamp", "Lancaster", "Furla", "Michael Kors", "Coach",
    "Jimmy Choo", "Louboutin", "Repetto", "Jonak", "Minelli",
    "MAC Cosmetics", "Charlotte Tilbury", "Nars", "Benefit",
    "Estee Lauder", "Lancome", "Chanel Beaute", "Dior Beaute",
    "Guerlain", "YSL Beaute", "Tom Ford Beauty",
    "Lacoste", "Ralph Lauren", "Tommy Hilfiger", "Hugo Boss",
    "Nike", "Adidas", "New Balance", "Veja", "Golden Goose",
    "Petit Bateau", "Bonpoint", "Jacadi", "Tartine et Chocolat",
    "Rimowa", "Samsonite", "Tumi", "Montblanc",
]


class GaleriesLafayetteScraper(BaseScraper):
    marketplace_key = "galeries_lafayette"
    marketplace_name = "Galeries Lafayette"

    def get_brands_url(self) -> str:
        return MARKETPLACES["galeries_lafayette"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """Galeries Lafayette returns 403 — use curated brand list."""
        soup = BeautifulSoup(html, "html.parser")
        brands = []
        base = MARKETPLACES["galeries_lafayette"]["base_url"]

        # Try HTML parsing first
        for link in soup.find_all("a", href=True):
            href = link["href"]
            name = link.get_text(strip=True)
            if name and len(name) > 1 and ("/b/" in href or "/marque/" in href):
                full_url = href if href.startswith("http") else base + href
                brands.append({"name": name, "url": full_url})

        if not brands:
            print("  [!] Galeries Lafayette blocks automated access, using curated brand list")
            for name in GALERIES_MARKETPLACE_BRANDS:
                slug = name.lower().replace(" ", "-").replace("'", "").replace("&", "et")
                brands.append({
                    "name": name,
                    "url": f"{base}/b/{slug}",
                })

        return brands

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        categories = []
        name_lower = brand_info["name"].lower()
        for mirakl_cat, keywords in MIRAKL_CATEGORIES.items():
            if any(kw in name_lower for kw in keywords):
                categories.append(mirakl_cat)

        # Galeries Lafayette is luxury-focused
        return Seller(
            name=brand_info["name"],
            marketplace_source=self.marketplace_key,
            brand_url=brand_info.get("url", ""),
            categories=categories or ["luxury", "fashion"],
            price_range="premium",
            product_count=0,
            country="FR",
            distribution_type="mono-brand",
        )

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Try HTTP first, fallback to curated list."""
        print(f"\n{'='*60}")
        print(f"  Scraping {self.marketplace_name}...")
        print(f"{'='*60}")

        html = self.fetch(self.get_brands_url()) or ""
        brands = self.parse_brands(html)
        print(f"  Found {len(brands)} brands on {self.marketplace_name}")

        brands = brands[:max_brands]

        for brand in brands:
            seller = self.parse_brand_detail("", brand)
            if seller:
                self.sellers.append(seller)

        print(f"  Total: {len(self.sellers)} sellers from {self.marketplace_name}")
        return self.sellers
