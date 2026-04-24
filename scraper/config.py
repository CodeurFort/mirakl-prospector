import os
from dotenv import load_dotenv

load_dotenv()

# --- Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# --- Rate limiting ---
REQUEST_DELAY = 2  # secondes entre chaque requête
MAX_RETRIES = 3
TIMEOUT = 15  # secondes

# --- Marketplace URLs ---
MARKETPLACES = {
    "zalando": {
        "name": "Zalando",
        "brands_url": "https://www.zalando.fr/marques/",
        "base_url": "https://www.zalando.fr",
        "country": "EU",
    },
    "laredoute": {
        "name": "La Redoute",
        "brands_url": "https://www.laredoute.fr/index/brand.aspx",
        "base_url": "https://www.laredoute.fr",
        "country": "FR",
    },
    "galeries_lafayette": {
        "name": "Galeries Lafayette",
        "brands_url": "https://www.galerieslafayette.com/b/market-set",
        "base_url": "https://www.galerieslafayette.com",
        "country": "FR",
    },
    "john_lewis": {
        "name": "John Lewis",
        "brands_url": "https://www.johnlewis.com/brands",
        "base_url": "https://www.johnlewis.com",
        "country": "UK",
    },
    "debenhams": {
        "name": "Debenhams",
        "brands_url": "https://www.debenhams.com/page/marketplace-brands",
        "base_url": "https://www.debenhams.com",
        "country": "UK",
    },
    "bloomingdales": {
        "name": "Bloomingdales",
        "brands_url": "https://www.bloomingdales.com/shop/marketplace?id=1245995",
        "base_url": "https://www.bloomingdales.com",
        "country": "US",
    },
    "nordstrom": {
        "name": "Nordstrom",
        "brands_url": "https://www.nordstrom.com/brands/market--23731",
        "base_url": "https://www.nordstrom.com",
        "country": "US",
    },
}

# --- Catégories Mirakl Connect cibles ---
MIRAKL_CATEGORIES = {
    "fashion": ["clothing", "fashion", "apparel", "wear", "dress", "shirt", "jeans",
                 "denim", "outerwear", "jacket", "coat", "lingerie", "swimwear",
                 "vêtements", "mode", "robe", "pantalon", "veste"],
    "footwear": ["shoes", "sneakers", "boots", "sandals", "footwear",
                  "chaussures", "baskets", "bottes"],
    "beauty": ["beauty", "skincare", "makeup", "cosmetics", "fragrance", "perfume",
                "grooming", "hair care", "beauté", "soins", "maquillage", "parfum"],
    "accessories": ["bags", "handbags", "backpack", "luggage", "jewelry", "watches",
                     "sunglasses", "accessories", "sacs", "bijoux", "montres"],
    "sports": ["sport", "running", "fitness", "outdoor", "yoga", "athletic",
                "activewear", "sportswear"],
    "kids": ["kids", "children", "baby", "toddler", "boys", "girls",
              "enfants", "bébé", "fille", "garçon"],
    "luxury": ["luxury", "premium", "designer", "luxe", "haute"],
    "home": ["home", "maison", "décoration", "deco", "interior", "furniture",
             "meuble", "literie", "bedding", "kitchen", "cuisine", "candle",
             "bougie", "tableware", "vaisselle", "linen", "textile", "cushion",
             "coussin", "mug", "tasse", "cuillère", "cutlery"],
    "wellness": ["wellness", "bien-être", "fitness", "yoga", "meditation",
                 "aromatherapy", "spa", "self-care"],
}

# --- Scoring weights (per-marketplace) ---
SCORING_WEIGHTS = {
    "category_fit": 0.30,
    "price_fit": 0.25,
    "geography_fit": 0.25,
    "catalog_depth": 0.10,
    "distribution_type": 0.10,
}

# --- Scoring thresholds ---
SCORE_HIGH = 70
SCORE_MEDIUM = 50

# --- Marketplace profiles for per-marketplace scoring ---
# Each marketplace has preferred categories, price ranges, and geographies.
# These drive the match score per (seller × marketplace) pair.
MARKETPLACE_PROFILES = {
    "zalando": {
        "name": "Zalando",
        "preferred_categories": ["fashion", "footwear", "beauty", "accessories", "sports", "kids", "home"],
        "preferred_prices": ["mid", "budget"],           # mid-range mass market
        "accepted_prices": ["premium"],                   # also OK but lower score
        "preferred_countries": ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "PL", "SE", "DK", "EU"],
        "accepted_countries": ["UK"],
        "min_catalog": 10,
    },
    "laredoute": {
        "name": "La Redoute",
        "preferred_categories": ["fashion", "kids", "accessories", "beauty", "home"],
        "preferred_prices": ["mid", "budget"],
        "accepted_prices": ["premium"],
        "preferred_countries": ["FR"],
        "accepted_countries": ["BE", "EU", "DE", "ES", "IT"],
        "min_catalog": 10,
    },
    "galeries_lafayette": {
        "name": "Galeries Lafayette",
        "preferred_categories": ["fashion", "luxury", "beauty", "accessories", "footwear"],
        "preferred_prices": ["premium", "luxury"],        # upscale positioning
        "accepted_prices": ["mid"],
        "preferred_countries": ["FR"],
        "accepted_countries": ["IT", "EU", "UK", "US"],
        "min_catalog": 5,
    },
    "john_lewis": {
        "name": "John Lewis",
        "preferred_categories": ["fashion", "beauty", "kids", "accessories", "home"],
        "preferred_prices": ["mid", "premium"],
        "accepted_prices": ["budget"],
        "preferred_countries": ["UK"],
        "accepted_countries": ["FR", "EU", "DE", "SE", "DK"],
        "min_catalog": 10,
    },
    "debenhams": {
        "name": "Debenhams",
        "preferred_categories": ["fashion", "beauty", "accessories", "footwear", "sports", "home"],
        "preferred_prices": ["mid", "budget"],
        "accepted_prices": ["premium"],
        "preferred_countries": ["UK"],
        "accepted_countries": ["FR", "EU", "DE", "US"],
        "min_catalog": 10,
    },
    "bloomingdales": {
        "name": "Bloomingdales",
        "preferred_categories": ["fashion", "luxury", "beauty", "accessories", "footwear"],
        "preferred_prices": ["premium", "luxury"],
        "accepted_prices": ["mid"],
        "preferred_countries": ["US"],
        "accepted_countries": ["FR", "IT", "UK", "EU"],
        "min_catalog": 5,
    },
    "nordstrom": {
        "name": "Nordstrom",
        "preferred_categories": ["fashion", "beauty", "footwear", "accessories", "sports", "home"],
        "preferred_prices": ["mid", "premium"],
        "accepted_prices": ["luxury"],
        "preferred_countries": ["US"],
        "accepted_countries": ["FR", "UK", "EU", "IT", "SE"],
        "min_catalog": 10,
    },
}

# --- Marketplace expansion trends (cross-over catégories) ---
# Boost sellers whose categories align with a marketplace's expansion strategy.
MARKETPLACE_TRENDS = {
    "zalando": {
        "expanding_into": ["home", "wellness"],
        "trend_boost": 10,
    },
    "john_lewis": {
        "expanding_into": ["beauty", "wellness"],
        "trend_boost": 5,
    },
}
