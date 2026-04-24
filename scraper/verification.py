"""
Double-vérification du matching marketplace — remplace le fuzzy substring naïf.

3 passes :
1. Normalisation stricte (accents, ponctuation, articles) + SequenceMatcher ≥ 0.90
2. Match par domaine (cross-ref company_domain vs marketplace brand URLs)
3. Match exact pour noms courts (≤ 4 chars) — pas de fuzzy
"""
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Dict, Set


# Articles / mots-outils à retirer pour la normalisation
_STOPWORDS = {"le", "la", "les", "the", "a", "an", "de", "du", "des", "&", "and", "et"}


def _normalize(name: str) -> str:
    """Normalise un nom de marque pour comparaison.

    - lowercase
    - supprime accents
    - supprime ponctuation
    - retire articles / mots-outils
    """
    # lowercase
    name = name.lower().strip()
    # remove accents
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    # remove punctuation (keep spaces & alphanumeric)
    name = re.sub(r"[^a-z0-9\s]", "", name)
    # remove stopwords
    tokens = [t for t in name.split() if t not in _STOPWORDS]
    return " ".join(tokens)


def check_marketplace_presence(
    seller_name: str,
    seller_domain: str,
    marketplace_brands: Dict[str, set],
    marketplace_brand_domains: Dict[str, set] = None,
) -> Set[str]:
    """Détermine sur quelles marketplaces le seller est déjà présent.

    Args:
        seller_name: nom brut du seller
        seller_domain: domaine web du seller (ex: "sezane.com"), peut être ""
        marketplace_brands: {mp_key: set of brand names (lowercase)}
        marketplace_brand_domains: {mp_key: set of domains}, optionnel

    Returns:
        Set des mp_keys où le seller est déjà présent.
    """
    if marketplace_brand_domains is None:
        marketplace_brand_domains = {}

    present_on: Set[str] = set()
    seller_norm = _normalize(seller_name)
    seller_domain_clean = seller_domain.strip().lower()

    for mp_key, brands in marketplace_brands.items():
        if _is_present(seller_name, seller_norm, seller_domain_clean, brands,
                       marketplace_brand_domains.get(mp_key, set())):
            present_on.add(mp_key)

    return present_on


def _is_present(
    seller_name_raw: str,
    seller_norm: str,
    seller_domain: str,
    brand_names: set,
    brand_domains: set,
) -> bool:
    """Vérifie si le seller est présent parmi les marques d'une marketplace."""
    seller_lower = seller_name_raw.strip().lower()

    # --- Pass 1: Exact match (lowercase) ---
    if seller_lower in brand_names:
        return True

    # --- Pass 2: Domain match (most reliable) ---
    if seller_domain and brand_domains:
        if seller_domain in brand_domains:
            return True

    # --- Pass 3: Noms courts (≤ 4 chars) → exact only, pas de fuzzy ---
    if len(seller_norm) <= 4:
        # Only match if normalized name matches a normalized brand exactly
        for brand in brand_names:
            if _normalize(brand) == seller_norm:
                return True
        return False  # No fuzzy for short names

    # --- Pass 4: Normalized fuzzy match for names ≥ 5 chars ---
    for brand in brand_names:
        brand_norm = _normalize(brand)
        if not brand_norm:
            continue
        # Skip if the brand is also very short (avoid "iro" matching "iron")
        if len(brand_norm) <= 4:
            continue
        ratio = SequenceMatcher(None, seller_norm, brand_norm).ratio()
        if ratio >= 0.90:
            return True

    return False
