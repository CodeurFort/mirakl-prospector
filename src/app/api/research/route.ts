import { NextRequest } from "next/server";
import { analyzeMarketplace } from "@/lib/openai";
import { getAllSellersForScoring } from "@/lib/supabase";
import { scoreSellerForProfile } from "@/lib/scoring";
import type { MarketplaceProfile } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { marketplaceName } = await request.json();

    if (!marketplaceName) {
      return Response.json(
        { error: "marketplaceName required" },
        { status: 400 }
      );
    }

    // Step 1: Analyze marketplace with GPT-4o
    const profile: MarketplaceProfile =
      await analyzeMarketplace(marketplaceName);

    // Step 2: Get all sellers from Supabase
    const sellers = await getAllSellersForScoring();

    // Step 3: Score each seller against this new marketplace profile
    const scoredSellers = (sellers || [])
      .map((seller) => {
        const category = seller.category?.label || "";
        const country = seller.country?.code || "";
        const priceLabel = seller.price_category?.label || "";
        const priceRange = priceLabel.includes("budget")
          ? "budget"
          : priceLabel.includes("mid")
            ? "mid"
            : priceLabel.includes("premium")
              ? "premium"
              : priceLabel.includes("luxury")
                ? "luxury"
                : "mid";

        // Check if seller is a known brand on this marketplace
        const isAlreadyPresent = profile.known_brands?.some(
          (brand) =>
            brand.toLowerCase() === seller.seller_name.toLowerCase() ||
            seller.seller_name.toLowerCase().includes(brand.toLowerCase()) ||
            brand.toLowerCase().includes(seller.seller_name.toLowerCase())
        );

        if (isAlreadyPresent) return null;

        const score = scoreSellerForProfile(
          {
            category,
            priceRange,
            country,
            catalogueSize: seller.catalogue_size || "Unknown",
          },
          profile
        );

        return {
          id: seller.id,
          name: seller.seller_name,
          category,
          country,
          priceRange: priceLabel,
          catalogueSize: seller.catalogue_size,
          score,
          priority:
            score >= 70 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW",
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) => (b?.score || 0) - (a?.score || 0)
      );

    return Response.json({
      marketplace: profile,
      sellers: scoredSellers,
      totalSellers: scoredSellers.length,
      highPriority: scoredSellers.filter((s) => s?.priority === "HIGH").length,
      mediumPriority: scoredSellers.filter((s) => s?.priority === "MEDIUM")
        .length,
    });
  } catch (error) {
    console.error("Error in marketplace research:", error);
    return Response.json(
      { error: "Failed to analyze marketplace" },
      { status: 500 }
    );
  }
}
