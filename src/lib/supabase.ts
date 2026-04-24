import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSellers(filters?: {
  marketplace?: string;
  category?: string;
  priority?: string;
  search?: string;
  catalogueSize?: string;
  priceCategory?: string;
  customerCategory?: string;
  country?: string;
  amazonPresence?: "yes" | "no";
  distributionType?: string;
}) {
  let query = supabase
    .from("sellers")
    .select(
      `
      *,
      category:ref_product_categories(label),
      country:ref_countries(label, code),
      price_category:ref_price_categories(label),
      distribution_type:ref_distribution_types(label),
      customer_category:ref_customer_categories(label),
      seasonality:ref_seasonality(label),
      marketplace:marketplaces("marketplace name")
    `
    )
    .order("match_score", { ascending: false });

  if (filters?.marketplace) {
    query = query.eq("top_match_marketplace_id", filters.marketplace);
  }
  if (filters?.category) {
    query = query.eq("category_id", filters.category);
  }
  if (filters?.search) {
    query = query.ilike("seller_name", `%${filters.search}%`);
  }
  if (filters?.catalogueSize) {
    query = query.eq("catalogue_size", filters.catalogueSize);
  }
  if (filters?.priceCategory) {
    query = query.eq("price_category_id", filters.priceCategory);
  }
  if (filters?.customerCategory) {
    query = query.eq("customer_category_id", filters.customerCategory);
  }
  if (filters?.country) {
    query = query.eq("country_id", filters.country);
  }
  if (filters?.distributionType) {
    query = query.eq("distribution_type_id", filters.distributionType);
  }
  if (filters?.amazonPresence === "yes") {
    query = query.eq("amazon_presence", true);
  }
  if (filters?.amazonPresence === "no") {
    query = query.eq("amazon_presence", false);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by priority in JS since it's computed
  if (filters?.priority && data) {
    return data.filter((s) => {
      const score = s.match_score || 0;
      if (filters.priority === "HIGH") return score >= 70;
      if (filters.priority === "MEDIUM") return score >= 50 && score < 70;
      if (filters.priority === "LOW") return score < 50;
      return true;
    });
  }

  return data;
}

export async function getSellerById(id: string) {
  const { data, error } = await supabase
    .from("sellers")
    .select(
      `
      *,
      category:ref_product_categories(label),
      country:ref_countries(label, code),
      price_category:ref_price_categories(label),
      distribution_type:ref_distribution_types(label),
      customer_category:ref_customer_categories(label),
      seasonality:ref_seasonality(label),
      marketplace:marketplaces("marketplace name")
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getMarketplaces() {
  const { data, error } = await supabase
    .from("marketplaces")
    .select('id, "marketplace name", description, categories');
  if (error) throw error;
  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("ref_product_categories")
    .select("id, label");
  if (error) throw error;
  return data;
}

export async function getAllSellersForScoring() {
  const { data, error } = await supabase
    .from("sellers")
    .select(
      `
      *,
      category:ref_product_categories(label),
      country:ref_countries(label, code),
      price_category:ref_price_categories(label),
      distribution_type:ref_distribution_types(label),
      customer_category:ref_customer_categories(label),
      seasonality:ref_seasonality(label),
      marketplace:marketplaces("marketplace name")
    `
    );
  if (error) throw error;
  return data;
}

export async function getPriceCategories() {
  const { data, error } = await supabase
    .from("ref_price_categories")
    .select("id, label");
  if (error) throw error;
  return data;
}

export async function getCustomerCategories() {
  const { data, error } = await supabase
    .from("ref_customer_categories")
    .select("id, label");
  if (error) throw error;
  return data;
}

export async function getDistributionTypes() {
  const { data, error } = await supabase
    .from("ref_distribution_types")
    .select("id, label");
  if (error) throw error;
  return data;
}

export async function getCountries() {
  const { data, error } = await supabase
    .from("ref_countries")
    .select("id, label, code")
    .order("label", { ascending: true });
  if (error) throw error;
  return data;
}

// ── Cached reference-table lookups ────────────────────────────────────────
// Many routes need to translate a human label (e.g. "fashion", "FR", "luxury")
// into the Supabase UUID of its ref row. We load each ref table once per
// server process and reuse the map for subsequent lookups.

interface RefMap {
  byLabel: Map<string, string>;
  byCode?: Map<string, string>;
}

let categoryMap: RefMap | null = null;
let priceMap: RefMap | null = null;
let countryMap: RefMap | null = null;

async function loadRefMap(
  table: string,
  hasCode: boolean
): Promise<RefMap> {
  const cols = hasCode ? "id, label, code" : "id, label";
  const { data, error } = await supabase.from(table).select(cols);
  if (error) throw error;

  const byLabel = new Map<string, string>();
  const byCode = hasCode ? new Map<string, string>() : undefined;

  for (const row of (data as unknown as Array<{ id: string; label: string; code?: string }>) || []) {
    if (row.label) byLabel.set(row.label.toLowerCase(), row.id);
    if (row.code && byCode) byCode.set(row.code.toLowerCase(), row.id);
  }
  return { byLabel, byCode };
}

export async function getCategoryId(label: string): Promise<string | null> {
  if (!label) return null;
  if (!categoryMap) categoryMap = await loadRefMap("ref_product_categories", false);
  return categoryMap.byLabel.get(label.toLowerCase()) || null;
}

export async function getPriceId(label: string): Promise<string | null> {
  if (!label) return null;
  if (!priceMap) priceMap = await loadRefMap("ref_price_categories", false);

  const needle = label.toLowerCase();
  // Try exact label first, then substring (e.g. "mid" → "Mid-range (30-100€)")
  const direct = priceMap.byLabel.get(needle);
  if (direct) return direct;
  for (const [key, id] of priceMap.byLabel) {
    if (key.startsWith(needle) || key.includes(needle)) return id;
  }
  return null;
}

export async function getCountryId(codeOrLabel: string): Promise<string | null> {
  if (!codeOrLabel) return null;
  if (!countryMap) countryMap = await loadRefMap("ref_countries", true);
  const needle = codeOrLabel.toLowerCase();
  return countryMap.byCode?.get(needle) || countryMap.byLabel.get(needle) || null;
}
