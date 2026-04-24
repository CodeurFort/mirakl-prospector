import time
import random
from abc import ABC, abstractmethod
from typing import Optional, List, Dict
from curl_cffi import requests as cffi_requests

from config import REQUEST_DELAY, MAX_RETRIES, TIMEOUT
from models import Seller


class BaseScraper(ABC):
    """Base scraper with curl_cffi for Cloudflare bypass."""

    marketplace_key: str = ""
    marketplace_name: str = ""

    def __init__(self):
        self.session = cffi_requests.Session(impersonate="chrome110")
        self.sellers: List[Seller] = []

    def fetch(self, url: str) -> Optional[str]:
        """GET request with retry, rate limit, and realistic delays."""
        for attempt in range(MAX_RETRIES):
            try:
                # Random delay to look human
                delay = REQUEST_DELAY + random.uniform(0.5, 1.5)
                time.sleep(delay)

                resp = self.session.get(url, timeout=TIMEOUT)

                if resp.status_code == 200:
                    return resp.text
                elif resp.status_code == 403:
                    print(f"  [!] 403 Forbidden on {url} (attempt {attempt + 1})")
                    time.sleep(5)
                elif resp.status_code == 429:
                    print(f"  [!] Rate limited on {url}, waiting 30s...")
                    time.sleep(30)
                else:
                    print(f"  [!] HTTP {resp.status_code} on {url}")

            except Exception as e:
                print(f"  [!] Error fetching {url}: {e}")
                time.sleep(3)

        print(f"  [X] Failed after {MAX_RETRIES} attempts: {url}")
        return None

    @abstractmethod
    def parse_brands(self, html: str) -> List[Dict]:
        """Parse the brands listing page. Returns [{name, url}, ...]"""
        pass

    @abstractmethod
    def parse_brand_detail(self, html: str, brand_info: dict) -> Optional[Seller]:
        """Parse an individual brand page to extract seller details."""
        pass

    def run(self, max_brands: int = 50) -> List[Seller]:
        """Main scraping flow: fetch brands list → fetch each brand detail."""
        print(f"\n{'='*60}")
        print(f"  Scraping {self.marketplace_name}...")
        print(f"{'='*60}")

        # Step 1: Get brands listing page
        html = self.fetch(self.get_brands_url())
        if not html:
            print(f"  [X] Could not fetch brands page for {self.marketplace_name}")
            return []

        # Step 2: Parse brand list
        brands = self.parse_brands(html)
        print(f"  Found {len(brands)} brands on {self.marketplace_name}")

        # Limit for hackathon speed
        brands = brands[:max_brands]
        print(f"  Processing first {len(brands)} brands...")

        # Step 3: For each brand, fetch detail and create Seller
        for i, brand in enumerate(brands):
            print(f"  [{i+1}/{len(brands)}] {brand.get('name', '?')}...", end=" ")

            if brand.get("url"):
                detail_html = self.fetch(brand["url"])
                if detail_html:
                    seller = self.parse_brand_detail(detail_html, brand)
                    if seller:
                        self.sellers.append(seller)
                        print(f"OK ({seller.product_count} products)")
                        continue

            # If no detail page, create basic seller from listing info
            seller = Seller(
                name=brand.get("name", ""),
                marketplace_source=self.marketplace_key,
                brand_url=brand.get("url", ""),
                categories=brand.get("categories", []),
            )
            self.sellers.append(seller)
            print("(basic info only)")

        print(f"\n  Total: {len(self.sellers)} sellers from {self.marketplace_name}")
        return self.sellers

    @abstractmethod
    def get_brands_url(self) -> str:
        """Return the URL for the brands listing page."""
        pass
