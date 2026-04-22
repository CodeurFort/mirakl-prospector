import type { MarketplaceProfile } from "./types";

// Mirakl category keywords for fuzzy matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fashion: ["clothing", "fashion", "apparel", "wear", "dress"],
  footwear: ["shoes", "sneakers", "boots", "sandals", "footwear"],
  beauty: ["beauty", "skincare", "makeup", "cosmetics", "fragrance"],
  accessories: ["bags", "handbags", "jewelry", "watches", "accessories"],
  sports: ["sport", "running", "fitness", "outdoor", "athletic"],
  kids: ["kids", "children", "baby", "toddler"],
  luxury: ["luxury", "premium", "designer"],
};

const SCORING_WEIGHTS = {
  category_fit: 0.3,
  price_fit: 0.25,
  geography_fit: 0.25,
  catalog_depth: 0.1,
  distribution_type: 0.1,
};

function scoreCategoryFit(
  sellerCategory: string,
  preferredCategories: string[]
): number {
  if (!sellerCategory) return 0;
  const cat = sellerCategory.toLowerCase();
  if (preferredCategories.includes(cat)) return 100;
  for (const pref of preferredCategories) {
    const keywords = CATEGORY_KEYWORDS[pref] || [];
    if (keywords.some((kw) => cat.includes(kw))) return 60;
  }
  return 20;
}

function scorePriceFit(
  sellerPrice: string,
  profile: MarketplaceProfile
): number {
  if (!sellerPrice) return 30;
  if (profile.preferred_prices.includes(sellerPrice)) return 100;
  if (profile.accepted_prices.includes(sellerPrice)) return 60;
  return 20;
}

function scoreGeographyFit(
  sellerCountry: string,
  profile: MarketplaceProfile
): number {
  if (!sellerCountry) return 30;
  if (profile.preferred_countries.includes(sellerCountry)) return 100;
  if (profile.accepted_countries.includes(sellerCountry)) return 60;
  return 20;
}

function scoreCatalogDepth(catalogueSize: string): number {
  const sizeMap: Record<string, number> = {
    "Large (500+)": 100,
    "Medium (100-500)": 75,
    "Small (10-100)": 50,
    "Micro (<10)": 25,
    Unknown: 10,
  };
  return sizeMap[catalogueSize] || 10;
}

export function scoreSellerForProfile(
  seller: {
    category: string;
    priceRange: string;
    country: string;
    catalogueSize: string;
  },
  profile: MarketplaceProfile
): number {
  const w = SCORING_WEIGHTS;
  const catScore = scoreCategoryFit(seller.category, profile.preferred_categories);
  const priceScore = scorePriceFit(seller.priceRange, profile);
  const geoScore = scoreGeographyFit(seller.country, profile);
  const catalogScore = scoreCatalogDepth(seller.catalogueSize);
  const distScore = 80; // Default for DTC brands (mono-brand)

  const total =
    catScore * w.category_fit +
    priceScore * w.price_fit +
    geoScore * w.geography_fit +
    catalogScore * w.catalog_depth +
    distScore * w.distribution_type;

  return Math.min(100, Math.round(total * 10) / 10);
}
