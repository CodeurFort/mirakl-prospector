import { supabase, getMarketplaces } from "./supabase";
import type { MarketplaceProfileRecord } from "./bdr-engine";

const MATCHING_TABLE =
  process.env.SUPABASE_MARKETPLACE_MATCHING_TABLE || "marketplace_matching_profiles";

interface MatchingQueryResult {
  profiles: MarketplaceProfileRecord[];
  source: "matching" | "fallback";
  message?: string;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeMatchingRow(row: Record<string, unknown>, source: "matching" | "fallback"): MarketplaceProfileRecord {
  const name =
    String(
      row.marketplaceName ||
        row.marketplace_name ||
        row["marketplace name"] ||
        row.name ||
        "Marketplace"
    );

  return {
    id: String(row.id || name),
    marketplaceName: name,
    description: String(row.description || ""),
    region: String(row.region || row.primaryRegion || "Europe"),
    focusCategories: stringArray(row.focusCategories || row.focus_categories || row.categories),
    priceBands: stringArray(row.priceBands || row.price_bands),
    acceptedPriceBands: stringArray(row.acceptedPriceBands || row.accepted_price_bands),
    targetCountries: stringArray(row.targetCountries || row.target_countries),
    acceptedCountries: stringArray(row.acceptedCountries || row.accepted_countries),
    customerPositioning: stringArray(row.customerPositioning || row.customer_positioning),
    catalogueExpectation: stringArray(row.catalogueExpectation || row.catalogue_expectation),
    distributionPreferences: stringArray(
      row.distributionPreferences || row.distribution_preferences
    ),
    seasonalMoments: stringArray(row.seasonalMoments || row.seasonal_moments),
    companySizeFit: stringArray(row.companySizeFit || row.company_size_fit),
    heroStat: typeof row.heroStat === "string" ? row.heroStat : undefined,
    caution: typeof row.caution === "string" ? row.caution : undefined,
    rolesToScrape: stringArray(row.rolesToScrape || row.roles_to_scrape),
    signals: stringArray(row.signals),
    source,
  };
}

const BUILTIN_PROFILES: MarketplaceProfileRecord[] = [
  {
    id: "0c19bfab-66a9-406e-b609-4af8b9bcf098",
    marketplaceName: "Zalando",
    description: "Largest European fashion marketplace. 50M+ active customers across 25 markets.",
    region: "Europe",
    focusCategories: ["fashion", "footwear", "beauty", "accessories", "sports", "kids"],
    priceBands: ["mid"],
    acceptedPriceBands: ["budget", "premium"],
    targetCountries: ["DE", "FR", "NL", "BE", "IT", "ES", "SE", "DK", "AT", "PL"],
    acceptedCountries: ["UK", "US"],
    customerPositioning: ["women", "unisex"],
    catalogueExpectation: ["medium", "large"],
    distributionPreferences: ["mono-brand", "multi-brand"],
    seasonalMoments: ["always_on", "fashion_drop", "summer_sale"],
    companySizeFit: ["growth", "enterprise"],
    heroStat: "50M+ clients actifs, 25 marchés EU",
    caution: "Forte pression concurrentielle sur la catégorie fashion mid.",
    rolesToScrape: ["Head of Marketplace", "E-commerce Director"],
    signals: ["Leader EU fashion", "Présence obligatoire pour scale EU"],
    source: "fallback",
  },
  {
    id: "7bb79fa4-0ee7-406d-af81-9610d4b842d4",
    marketplaceName: "La Redoute",
    description: "Leading French marketplace for fashion and home. 10M+ customers, mainly France.",
    region: "France",
    focusCategories: ["fashion", "kids", "home", "accessories"],
    priceBands: ["budget", "mid"],
    acceptedPriceBands: ["premium"],
    targetCountries: ["FR", "BE"],
    acceptedCountries: ["DE", "ES", "IT", "NL"],
    customerPositioning: ["women", "family"],
    catalogueExpectation: ["medium", "large"],
    distributionPreferences: ["mono-brand", "multi-brand"],
    seasonalMoments: ["always_on", "back_to_school", "holiday_gifting"],
    companySizeFit: ["growth", "enterprise"],
    heroStat: "10M+ clients, leader mode famille France",
    caution: "Positionnement family/kids — moins adapté aux marques premium pures.",
    rolesToScrape: ["Head of Marketplace", "Sales Director"],
    signals: ["Fort ancrage France", "Trafic famille et kidswear"],
    source: "fallback",
  },
  {
    id: "1518fd76-85c0-4e7c-9a0c-fe4deb4818dd",
    marketplaceName: "Galerie Lafayette",
    description: "Iconic French department store. Premium to luxury, curated brand selection.",
    region: "France / EU",
    focusCategories: ["fashion", "luxury", "beauty", "accessories", "footwear"],
    priceBands: ["premium", "luxury"],
    acceptedPriceBands: ["mid"],
    targetCountries: ["FR"],
    acceptedCountries: ["IT", "UK", "DE", "US"],
    customerPositioning: ["women", "men"],
    catalogueExpectation: ["small", "medium"],
    distributionPreferences: ["mono-brand"],
    seasonalMoments: ["fashion_drop", "holiday_gifting", "always_on"],
    companySizeFit: ["scaleup", "growth"],
    heroStat: "Vitrine premium Paris, sélection très curatée",
    caution: "Processus de sélection exigeant — budget et multi-brand difficiles.",
    rolesToScrape: ["Head of Marketplace", "Founder/CEO"],
    signals: ["Image premium forte", "Clientèle internationale Paris"],
    source: "fallback",
  },
  {
    id: "f08afd75-ad5d-45da-8387-7e5eea7e4d71",
    marketplaceName: "John Lewis",
    description: "Premium British department store. Quality-focused, UK-centric.",
    region: "United Kingdom",
    focusCategories: ["fashion", "beauty", "home", "kids", "accessories"],
    priceBands: ["mid", "premium"],
    acceptedPriceBands: ["budget", "luxury"],
    targetCountries: ["UK"],
    acceptedCountries: ["IE"],
    customerPositioning: ["women", "family", "unisex"],
    catalogueExpectation: ["medium", "large"],
    distributionPreferences: ["mono-brand", "multi-brand"],
    seasonalMoments: ["always_on", "holiday_gifting", "back_to_school"],
    companySizeFit: ["growth", "enterprise"],
    heroStat: "Référence qualité UK, clientèle premium",
    caution: "Focus UK — moins pertinent pour sellers sans ancrage anglophone.",
    rolesToScrape: ["Head of Marketplace", "Sales Director"],
    signals: ["Confiance client élevée", "Catégorie home et kids forte"],
    source: "fallback",
  },
  {
    id: "7afbbb07-b2c4-4fd0-8f0b-f326de14aca6",
    marketplaceName: "Debenhams",
    description: "British online marketplace. Broad mid-range, 1500+ partner brands.",
    region: "United Kingdom",
    focusCategories: ["fashion", "beauty", "accessories", "home", "footwear", "sports"],
    priceBands: ["budget", "mid"],
    acceptedPriceBands: ["premium"],
    targetCountries: ["UK"],
    acceptedCountries: ["IE", "EU", "US"],
    customerPositioning: ["unisex", "women", "men"],
    catalogueExpectation: ["medium", "large"],
    distributionPreferences: ["multi-brand", "mono-brand"],
    seasonalMoments: ["always_on", "summer_sale", "black_friday"],
    companySizeFit: ["growth", "enterprise"],
    heroStat: "1500+ marques partenaires, UK mass market",
    caution: "Positionnement mass market — peu adapté au luxe.",
    rolesToScrape: ["Marketplace Manager", "Sales Director"],
    signals: ["Volume UK élevé", "Accessible aux marques émergentes"],
    source: "fallback",
  },
  {
    id: "e528ca09-6fc5-4c6d-a087-16ee6bb5b22a",
    marketplaceName: "Bloomingdales",
    description: "Upscale American department store. Premium to luxury, affluent US clientele.",
    region: "United States",
    focusCategories: ["fashion", "luxury", "beauty", "accessories", "footwear"],
    priceBands: ["premium", "luxury"],
    acceptedPriceBands: ["mid"],
    targetCountries: ["US"],
    acceptedCountries: ["CA", "UK"],
    customerPositioning: ["women", "men"],
    catalogueExpectation: ["small", "medium"],
    distributionPreferences: ["mono-brand"],
    seasonalMoments: ["fashion_drop", "holiday_gifting", "always_on"],
    companySizeFit: ["scaleup", "growth"],
    heroStat: "Référence luxury US, clientèle aisée côte Est",
    caution: "Marché US — logistique et douanes à anticiper.",
    rolesToScrape: ["Head of Marketplace", "Founder/CEO"],
    signals: ["Image prestige US", "Fort pour bijoux et accessoires premium"],
    source: "fallback",
  },
  {
    id: "7c559fa5-27a1-491d-8be7-323b9410e6e3",
    marketplaceName: "Nordstrom",
    description: "Premium American department store. Mid-to-premium, US and Canada.",
    region: "United States / Canada",
    focusCategories: ["fashion", "beauty", "footwear", "accessories", "sports"],
    priceBands: ["mid", "premium"],
    acceptedPriceBands: ["luxury", "budget"],
    targetCountries: ["US", "CA"],
    acceptedCountries: ["UK"],
    customerPositioning: ["women", "men", "kids", "unisex"],
    catalogueExpectation: ["medium", "large"],
    distributionPreferences: ["mono-brand", "multi-brand"],
    seasonalMoments: ["always_on", "holiday_gifting", "summer_sale"],
    companySizeFit: ["growth", "enterprise"],
    heroStat: "40M+ clients US/CA, fort sur chaussures et mode",
    caution: "Catalogue minimum recommandé : 50 SKUs actifs.",
    rolesToScrape: ["Head of Marketplace", "E-commerce Director"],
    signals: ["Ouverture internationale progressive", "Catégorie footwear très forte"],
    source: "fallback",
  },
];

export async function getMarketplaceProfiles(): Promise<MatchingQueryResult> {
  const { data, error } = await supabase.from(MATCHING_TABLE).select("*");

  if (!error && data && data.length > 0) {
    return {
      profiles: data.map((row) => normalizeMatchingRow(row as Record<string, unknown>, "matching")),
      source: "matching",
    };
  }

  return {
    profiles: BUILTIN_PROFILES,
    source: "fallback",
  };
}

export async function getMatchingResults(_brandName: string, _domain: string) {
  const profilesResult = await getMarketplaceProfiles();
  if (profilesResult.source === "fallback") {
    return {
      profiles: profilesResult.profiles,
      source: "fallback" as const,
      message: profilesResult.message || "Table de matching en cours de configuration",
    };
  }

  return {
    profiles: profilesResult.profiles,
    source: "matching" as const,
  };
}
