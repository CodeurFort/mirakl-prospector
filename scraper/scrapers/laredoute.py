import re
import json
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

from config import MARKETPLACES, MIRAKL_CATEGORIES
from models import Seller
from .base import BaseScraper


# Curated list of La Redoute marketplace sellers (500+ exist, here are the main ones)
LAREDOUTE_MARKETPLACE_BRANDS = [
    "La Redoute Collections", "CASTALUNA", "R essentiel", "R edition",
    "Nike", "Adidas", "Puma", "New Balance", "Converse", "Vans", "Reebok",
    "Levi's", "Wrangler", "Lee", "Pepe Jeans", "Kaporal", "Le Temps des Cerises",
    "Petit Bateau", "Cyrillus", "Vertbaudet", "DPAM", "Absorba",
    "Lacoste", "Tommy Hilfiger", "Calvin Klein", "Ralph Lauren", "Hugo Boss",
    "Mango", "Desigual", "Benetton", "Esprit", "Only", "Vero Moda",
    "Birkenstock", "Dr. Martens", "Timberland", "Kickers", "Geox",
    "Clarks", "Skechers", "Caterpillar",
    "Samsonite", "Eastpak", "Kipling", "Delsey",
    "L'Oreal", "Garnier", "Nivea", "Bioderma", "Avene",
    "Bosch", "Moulinex", "Philips", "Rowenta", "Tefal",
    "Camaieu", "Promod", "Cache Cache", "Jennyfer",
    "Salomon", "The North Face", "Columbia", "Quechua",
]


class LaRedouteScraper(BaseScraper):
    marketplace_key = "laredoute"
    marketplace_name = "La Redoute"

    def get_brands_url(self) -> str:
        return MARKETPLACES["laredoute"]["brands_url"]

    def parse_brands(self, html: str) -> List[Dict]:
        """La Redoute returns 403 — use curated brand list."""
        # Try parsing HTML first in case it worked
        soup = BeautifulSoup(html, "html.parser")
        brands = []
        base = MARKETPLACES["laredoute"]["base_url"]

        for link in soup.find_all("a", href=True):
            href = link["href"]
            name = link.get_text(strip=True)
            if name and len(name) > 1 and ("/brand" in href.lower() or "/pplp/" in href):
                full_url = href if href.startswith("http") else base + href
                brands.append({"name": name, "url": full_url})

        if not brands:
            print("  [!] La Redoute blocks automated access, using curated brand list")
            for name in LAREDOUTE_MARKETPLACE_BRANDS:
                slug = name.lower().replace(" ", "-").replace("'", "")
                brands.append({
                    "name": name,
                    "url": f"{base}/brand/{slug}/",
                })

        return brands

    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
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
            price_range="mid",
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
