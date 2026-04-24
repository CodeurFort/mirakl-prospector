import { NextRequest } from "next/server";
import { classifyBrandScope } from "@/lib/openai";
import {
  supabase,
  getCategoryId,
  getPriceId,
  getCountryId,
} from "@/lib/supabase";
import { getMarketplaceProfiles } from "@/lib/supabase-matching";
import { computeCriteria } from "@/lib/bdr-engine";
import type { Seller, MarketplaceRecommendation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── TLD → country fallback (when OpenAI doesn't resolve the country) ───────
const TLD_COUNTRY: Record<string, string> = {
  ".fr": "FR", ".de": "DE", ".co.uk": "UK", ".uk": "UK",
  ".it": "IT", ".es": "ES", ".nl": "NL", ".be": "BE",
  ".se": "SE", ".dk": "DK", ".at": "AT", ".pl": "PL",
  ".pt": "PT", ".ch": "CH", ".au": "AU", ".ca": "CA",
  ".jp": "JP",
};

function cleanDomain(raw: string): string {
  if (!raw) return "";
  let d = raw.trim().toLowerCase();
  for (const prefix of ["https://www.", "http://www.", "https://", "http://", "www."]) {
    if (d.startsWith(prefix)) {
      d = d.slice(prefix.length);
      break;
    }
  }
  return d.replace(/\/+$/, "").split("/")[0];
}

function inferCountryFromDomain(domain: string): string {
  if (!domain) return "US";
  const d = cleanDomain(domain);
  for (const [tld, country] of Object.entries(TLD_COUNTRY)) {
    if (d.endsWith(tld)) return country;
  }
  return "US";
}

export async function POST(request: NextRequest) {
  try {
    const { name, domain, roles } = await request.json();
    if (!name) {
      return Response.json({ error: "name requis" }, { status: 400 });
    }

    const cleanedDomain = cleanDomain(domain || "");

    // ── Step 1: classify via OpenAI (same gate as before) ─────────────────
    let classification;
    try {
      classification = await classifyBrandScope({
        brandName: name,
        companyDomain: cleanedDomain || undefined,
      });
    } catch (error) {
      return Response.json(
        {
          error: "Classification OpenAI indisponible — reessayer plus tard.",
          reason: error instanceof Error ? error.message : "Erreur classification",
        },
        { status: 503 }
      );
    }

    if (!classification.inScope) {
      return Response.json({
        outOfScope: true,
        reason: classification.reason,
        message: `${name} n'entre pas dans l'univers Mirakl Fashion (mode, beaute, accessoires, sport, kids, luxe, home, footwear).`,
        classification,
        sellerProfile: { category: null, country: classification.country, price: null },
        recommendations: [],
        sellerId: null,
        source: "classification",
        roles,
      });
    }

    // ── Step 2: resolve ref IDs ───────────────────────────────────────────
    const categoryLabel = classification.category!;
    const priceLabel = classification.priceBand || "mid";
    const countryCode = classification.country || inferCountryFromDomain(cleanedDomain);

    const [categoryId, priceId, countryId] = await Promise.all([
      getCategoryId(categoryLabel),
      getPriceId(priceLabel),
      getCountryId(countryCode),
    ]);

    // ── Step 3: upsert seller (by seller_name, same as Python path) ───────
    const { data: existing } = await supabase
      .from("sellers")
      .select("id")
      .ilike("seller_name", name)
      .limit(1)
      .maybeSingle();

    const row: Record<string, unknown> = {
      seller_name: name,
      company_domain: cleanedDomain || null,
      category_id: categoryId,
      country_id: countryId,
      price_category_id: priceId,
      status: "scraped",
    };

    let sellerId: string | null = null;
    if (existing?.id) {
      sellerId = existing.id;
      await supabase.from("sellers").update(row).eq("id", sellerId);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("sellers")
        .insert(row)
        .select("id")
        .single();
      if (insertError) throw insertError;
      sellerId = inserted?.id || null;
    }

    // ── Step 4: load marketplace profiles + score via bdr-engine ──────────
    const { profiles, source } = await getMarketplaceProfiles();

    // Pull the freshly upserted seller with its joined refs so scoring sees
    // consistent labels (the joined objects are what bdr-engine reads).
    const { data: freshSeller } = await supabase
      .from("sellers")
      .select(`
        *,
        category:ref_product_categories(label),
        country:ref_countries(label, code),
        price_category:ref_price_categories(label),
        distribution_type:ref_distribution_types(label),
        customer_category:ref_customer_categories(label),
        seasonality:ref_seasonality(label),
        marketplace:marketplaces("marketplace name")
      `)
      .eq("id", sellerId)
      .single();

    const seller = (freshSeller || row) as Seller;
    const snapshot = computeCriteria(seller, profiles);

    const recommendations: MarketplaceRecommendation[] = snapshot.operatorScores.map((op) => ({
      marketplaceId: op.marketplaceId,
      marketplaceName: op.marketplaceName,
      score: op.totalScore,
      priority: op.priority,
      region: op.region,
      heroStat: op.heroStat,
      whyItMatches: op.whyItMatches,
      cautions: op.cautions,
      matchingSignals: op.matchingSignals,
      rolesToScrape: op.rolesToScrape,
      criteria: op.criteria,
    }));

    // Store best match UUID + rationale in Supabase for future reads
    if (sellerId && recommendations[0]) {
      const rationale = recommendations
        .map((r) => `${r.marketplaceName}: ${Math.round(r.score)}`)
        .join(" | ");
      await supabase
        .from("sellers")
        .update({
          match_score: recommendations[0].score,
          top_match_marketplace_id: recommendations[0].marketplaceId,
          match_rationale: rationale,
        })
        .eq("id", sellerId);
    }

    return Response.json({
      sellerProfile: {
        category: categoryLabel,
        country: countryCode,
        price: priceLabel,
      },
      recommendations,
      sellerId,
      source: source === "matching" ? "scraping" : "scraping",
      outOfScope: false,
      message: `Seller ${name} score et insere en Supabase.`,
      classification,
      roles,
    });
  } catch (error) {
    console.error("scrape-seller error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur scraping" },
      { status: 500 }
    );
  }
}
