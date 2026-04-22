import { NextRequest } from "next/server";
import { getSellerById } from "@/lib/supabase";
import { generateEmail, analyzeCompetitors } from "@/lib/openai";
import { calculateROI, formatROIForEmail } from "@/lib/roi";

export async function POST(request: NextRequest) {
  try {
    const { sellerId, mailNumber } = await request.json();

    if (!sellerId || !mailNumber || ![1, 2, 3].includes(mailNumber)) {
      return Response.json(
        { error: "sellerId and mailNumber (1-3) required" },
        { status: 400 }
      );
    }

    const seller = await getSellerById(sellerId);
    if (!seller) {
      return Response.json({ error: "Seller not found" }, { status: 404 });
    }

    const category = seller.category?.label || "fashion";
    const country = seller.country?.code || "EU";
    const priceRange = seller.price_category?.label || "mid-range (30-100€)";
    const marketplace =
      seller.marketplace?.["marketplace name"] || "Zalando";
    const catalogueSize = seller.catalogue_size || "Unknown";

    // Parse match_rationale to get eligible marketplaces
    const rationale = seller.match_rationale || "";
    const eligibleParts = rationale
      .split("|")
      .filter((p: string) => !p.includes("Already on"))
      .map((p: string) => p.trim().split(":")[0]?.trim())
      .filter(Boolean);

    // Get competitors analysis
    let competitors = "Données non disponibles";
    let marketTrend =
      "Le e-commerce sur les marketplaces connaît une croissance de 15-20% par an";
    try {
      const competitorData = await analyzeCompetitors({
        sellerName: seller.seller_name,
        category,
        priceRange: priceRange.includes("budget")
          ? "budget"
          : priceRange.includes("mid")
            ? "mid"
            : priceRange.includes("premium")
              ? "premium"
              : "luxury",
        country,
      });
      competitors = competitorData.competitors
        .map(
          (c: { name: string; presentOn: string[] }) =>
            `${c.name} (sur ${c.presentOn.join(", ")})`
        )
        .join("; ");
      marketTrend = competitorData.marketTrend;
    } catch {
      // Continue with default values
    }

    // Calculate ROI
    const roi = calculateROI({
      catalogueSize,
      eligibleMarketplaces: eligibleParts.length || 3,
      category,
      priceRange: priceRange.includes("budget")
        ? "budget"
        : priceRange.includes("mid")
          ? "mid"
          : priceRange.includes("premium")
            ? "premium"
            : "luxury",
    });

    const email = await generateEmail({
      sellerName: seller.seller_name,
      category,
      country,
      priceRange,
      catalogueSize,
      matchScore: seller.match_score || 0,
      topMarketplace: marketplace,
      eligibleMarketplaces: eligibleParts.join(", ") || marketplace,
      competitors,
      marketTrend,
      roiEstimate: formatROIForEmail(roi),
      mailNumber: mailNumber as 1 | 2 | 3,
    });

    const timings = ["J0 — Premier contact", "J+5 — Relance ROI", "J+12 — Closing"];

    return Response.json({
      ...email,
      timing: timings[mailNumber - 1],
      mailNumber,
      roi,
      seller: {
        name: seller.seller_name,
        category,
        country,
        priceRange,
        marketplace,
        matchScore: seller.match_score,
      },
    });
  } catch (error) {
    console.error("Error generating email:", error);
    return Response.json(
      { error: "Failed to generate email" },
      { status: 500 }
    );
  }
}
