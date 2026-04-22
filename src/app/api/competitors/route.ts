import { NextRequest } from "next/server";
import { getSellerById } from "@/lib/supabase";
import { analyzeCompetitors } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { sellerId } = await request.json();
    if (!sellerId) {
      return Response.json({ error: "sellerId required" }, { status: 400 });
    }

    const seller = await getSellerById(sellerId);
    if (!seller) {
      return Response.json({ error: "Seller not found" }, { status: 404 });
    }

    const priceLabel = seller.price_category?.label || "";
    const result = await analyzeCompetitors({
      sellerName: seller.seller_name,
      category: seller.category?.label || "fashion",
      priceRange: priceLabel.includes("budget")
        ? "budget"
        : priceLabel.includes("mid")
          ? "mid"
          : priceLabel.includes("premium")
            ? "premium"
            : "luxury",
      country: seller.country?.code || "EU",
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error analyzing competitors:", error);
    return Response.json(
      { error: "Failed to analyze competitors" },
      { status: 500 }
    );
  }
}
