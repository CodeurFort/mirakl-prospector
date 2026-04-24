"""
Marketplace Filter — loads brand NAMES from the 7 marketplaces (fast, listing pages only)
and checks if a candidate seller is already present on any of them.
"""
import json
import os
import re
import time
from typing import List, Dict, Set, Tuple

from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests

from config import MARKETPLACES


CACHE_FILE = "marketplace_brands_cache.json"


def _scrape_zalando_names(session) -> Set[str]:
    """Extract brand names from Zalando /marques/ (embedded JSON, 1 request)."""
    r = session.get(MARKETPLACES["zalando"]["brands_url"], timeout=15)
    if r.status_code != 200:
        return set()
    pattern = re.compile(r'"name":"([^"]+)","uri":"https://www\.zalando\.fr/')
    names = set()
    for match in pattern.finditer(r.text):
        name = match.group(1).encode().decode("unicode_escape").strip().lower()
        names.add(name)
    return names


def _scrape_john_lewis_names(session) -> Set[str]:
    """Extract brand names from John Lewis __NEXT_DATA__ (1 request)."""
    r = session.get(MARKETPLACES["john_lewis"]["brands_url"], timeout=15)
    if r.status_code != 200:
        return set()
    soup = BeautifulSoup(r.text, "html.parser")
    script = soup.find("script", id="__NEXT_DATA__")
    if not script:
        return set()
    try:
        data = json.loads(script.string)
        brands_dict = data.get("props", {}).get("pageProps", {}).get("brands", {})
        names = set()
        for letter_brands in brands_dict.values():
            for b in letter_brands:
                name = b.get("label", "").strip().lower()
                if name:
                    names.add(name)
        return names
    except (json.JSONDecodeError, KeyError):
        return set()


def _scrape_debenhams_names(session) -> Set[str]:
    """Extract brand names from Debenhams category links (1 request)."""
    r = session.get(MARKETPLACES["debenhams"]["brands_url"], timeout=15)
    if r.status_code != 200:
        return set()
    soup = BeautifulSoup(r.text, "html.parser")
    names = set()
    for link in soup.find_all("a", href=True):
        href = link["href"]
        name = link.get_text(strip=True)
        if "-brands-" in href and "/categories/" in href and name and len(name) > 1:
            slug = href.split("-brands-")[-1]
            if not any(x in slug for x in ["offer", "sale", "selected"]):
                names.add(name.strip().lower())
    return names


def _curated_brands(brand_list: list) -> Set[str]:
    """Convert a curated brand list to lowercase set."""
    return {b.strip().lower() for b in brand_list}


# Curated lists for blocked marketplaces
_LAREDOUTE_BRANDS = [
    "La Redoute Collections", "CASTALUNA", "Nike", "Adidas", "Puma", "New Balance",
    "Converse", "Vans", "Reebok", "Levi's", "Wrangler", "Lee", "Pepe Jeans",
    "Kaporal", "Le Temps des Cerises", "Petit Bateau", "Cyrillus", "Vertbaudet",
    "Lacoste", "Tommy Hilfiger", "Calvin Klein", "Ralph Lauren", "Hugo Boss",
    "Mango", "Desigual", "Benetton", "Esprit", "Only", "Vero Moda",
    "Birkenstock", "Dr. Martens", "Timberland", "Kickers", "Geox", "Clarks",
    "Skechers", "Samsonite", "Eastpak", "Kipling", "Delsey",
    "L'Oreal", "Garnier", "Nivea", "Bioderma", "Avene",
    "Salomon", "The North Face", "Columbia", "Promod", "Cache Cache",
]

_GALERIES_BRANDS = [
    "Sandro", "Maje", "Claudie Pierlot", "Ba&sh", "Zadig & Voltaire",
    "The Kooples", "IRO", "Isabel Marant", "Ami Paris", "Jacquemus",
    "Kenzo", "Lanvin", "Balmain", "Givenchy", "Saint Laurent", "Gucci",
    "Prada", "Balenciaga", "Bottega Veneta", "Dior", "Louis Vuitton",
    "Longchamp", "Lancaster", "Furla", "Michael Kors", "Coach",
    "Jimmy Choo", "Repetto", "Jonak", "Minelli",
    "MAC Cosmetics", "Charlotte Tilbury", "Nars", "Benefit",
    "Estee Lauder", "Lancome", "Guerlain", "Tom Ford Beauty",
    "Lacoste", "Ralph Lauren", "Tommy Hilfiger", "Hugo Boss",
    "Nike", "Adidas", "New Balance", "Veja", "Golden Goose",
    "Petit Bateau", "Bonpoint", "Jacadi", "Rimowa", "Samsonite", "Tumi",
]

_BLOOMINGDALES_BRANDS = [
    "Ralph Lauren", "Calvin Klein", "Michael Kors", "Marc Jacobs", "Tory Burch",
    "Coach", "Kate Spade", "Vince", "Theory", "AllSaints", "Ted Baker", "Reiss",
    "Hugo Boss", "Tommy Hilfiger", "Free People", "Madewell", "Reformation",
    "Good American", "AG Jeans", "Frame", "Paige", "DL1961",
    "Stuart Weitzman", "Cole Haan", "Sam Edelman", "Steve Madden",
    "Clinique", "Estee Lauder", "MAC Cosmetics", "Bobbi Brown",
    "Jo Malone", "Tom Ford Beauty", "La Mer", "Kiehl's", "Charlotte Tilbury",
    "Nike", "Adidas", "New Balance", "Veja", "On Running",
    "Canada Goose", "The North Face", "Moncler", "Barbour",
]

_NORDSTROM_BRANDS = [
    "Vince", "Rag & Bone", "Theory", "AllSaints", "Reiss", "Ted Baker",
    "Madewell", "Free People", "Reformation", "Good American", "Veronica Beard",
    "Faherty", "Barbour", "Paige", "AG Jeans", "Frame", "DL1961",
    "Cole Haan", "Stuart Weitzman", "Sam Edelman", "Steve Madden", "Veja",
    "On Running", "Hoka", "New Balance", "Birkenstock", "Dr. Martens",
    "Tory Burch", "Kate Spade", "Coach", "Michael Kors", "Marc Jacobs",
    "Kiehl's", "Clinique", "MAC Cosmetics", "Bobbi Brown", "Jo Malone",
    "Nike", "Adidas", "Puma", "Under Armour",
    "Patagonia", "The North Face", "Arc'teryx", "Canada Goose",
    "Ralph Lauren", "Tommy Hilfiger", "Calvin Klein", "Hugo Boss",
]


def load_marketplace_brands(use_cache: bool = True) -> Dict[str, Set[str]]:
    """Load brand names from all 7 marketplaces (FAST — listing pages only).
    Returns {marketplace: set of lowercase brand names}.
    """
    # Try cache first
    if use_cache and os.path.exists(CACHE_FILE):
        print("  Loading marketplace brands from cache...")
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
        result = {k: set(v) for k, v in data.items()}
        total = sum(len(v) for v in result.values())
        print(f"  Loaded {total} brands across {len(result)} marketplaces (cached)")
        return result

    # Scrape fresh — ONE request per marketplace max
    print("  Scraping marketplace brand lists (1 request per marketplace)...")
    session = cffi_requests.Session(impersonate="chrome110")
    result = {}

    # Zalando (1 request, embedded JSON)
    print("    Zalando...", end=" ")
    result["zalando"] = _scrape_zalando_names(session)
    print(f"{len(result['zalando'])} brands")
    time.sleep(2)

    # La Redoute (curated, blocked)
    print("    La Redoute...", end=" ")
    result["laredoute"] = _curated_brands(_LAREDOUTE_BRANDS)
    print(f"{len(result['laredoute'])} brands (curated)")

    # Galeries Lafayette (curated, blocked)
    print("    Galeries Lafayette...", end=" ")
    result["galeries_lafayette"] = _curated_brands(_GALERIES_BRANDS)
    print(f"{len(result['galeries_lafayette'])} brands (curated)")

    # John Lewis (1 request, __NEXT_DATA__)
    print("    John Lewis...", end=" ")
    result["john_lewis"] = _scrape_john_lewis_names(session)
    print(f"{len(result['john_lewis'])} brands")
    time.sleep(2)

    # Debenhams (1 request, category links)
    print("    Debenhams...", end=" ")
    result["debenhams"] = _scrape_debenhams_names(session)
    print(f"{len(result['debenhams'])} brands")
    time.sleep(2)

    # Bloomingdales (curated, blocked)
    print("    Bloomingdales...", end=" ")
    result["bloomingdales"] = _curated_brands(_BLOOMINGDALES_BRANDS)
    print(f"{len(result['bloomingdales'])} brands (curated)")

    # Nordstrom (curated, SPA)
    print("    Nordstrom...", end=" ")
    result["nordstrom"] = _curated_brands(_NORDSTROM_BRANDS)
    print(f"{len(result['nordstrom'])} brands (curated)")

    # Save cache
    cache_data = {k: list(v) for k, v in result.items()}
    with open(CACHE_FILE, "w") as f:
        json.dump(cache_data, f, ensure_ascii=False)

    total = sum(len(v) for v in result.values())
    print(f"\n  Total: {total} brands across {len(result)} marketplaces (saved to cache)")
    return result


def check_presence(seller_name: str, marketplace_brands: Dict[str, Set[str]]) -> Tuple[bool, List[str]]:
    """Check if a seller is already on any marketplace."""
    name = seller_name.strip().lower()
    found_on = []

    for mp_name, brands in marketplace_brands.items():
        if name in brands:
            found_on.append(mp_name)
            continue

        # Fuzzy: check substring match for names > 4 chars
        for brand in brands:
            if len(name) > 4 and len(brand) > 4:
                if name in brand or brand in name:
                    found_on.append(mp_name)
                    break

    return len(found_on) > 0, found_on


def filter_candidates(candidates: list, marketplace_brands: Dict[str, Set[str]]) -> Tuple[list, list]:
    """Split candidates into new (not on any marketplace) and existing."""
    new = []
    existing = []

    for seller in candidates:
        is_present, found_on = check_presence(seller.name, marketplace_brands)
        if is_present:
            existing.append((seller, found_on))
        else:
            new.append(seller)

    return new, existing
