import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSellers(filters?: {
  marketplace?: string;
  category?: string;
  priority?: string;
  search?: string;
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
      price_category:ref_price_categories(label)
    `
    );
  if (error) throw error;
  return data;
}
