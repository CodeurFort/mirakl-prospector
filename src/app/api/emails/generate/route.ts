import { NextRequest } from "next/server";
import { getSellerById } from "@/lib/supabase";
import { generateEmail, analyzeCompetitors } from "@/lib/openai";
import { calculateROI, formatROIForEmail } from "@/lib/roi";

export async function POST(request: NextRequest) {
  try {
    const { sellerId, mailNumber, strategy, mailTiming, customInstructions } = await request.json();

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
    const marketplace = seller.marketplace?.["marketplace name"] || "Zalando";
    const catalogueSize = seller.catalogue_size || "Unknown";

    // Contact info from enrichment
    const sellerRaw = seller as Record<string, unknown>;
    const contactName = (sellerRaw.contact_name as string) || "";
    const contactJobTitle = (sellerRaw.contact_job_title as string) || "";
    const matchRationale = (sellerRaw.match_rationale as string) || "";

    const rationale = matchRationale;
    const eligibleParts = rationale
      .split("|")
      .filter((p: string) => !p.includes("Already on"))
      .map((p: string) => p.trim().split(":")[0]?.trim())
      .filter(Boolean);

    let competitors = "Similar brands in the category";
    let marketTrend = "Marketplace e-commerce growing 15-20% per year";
    try {
      const competitorData = await analyzeCompetitors({
        sellerName: seller.seller_name,
        category,
        priceRange: priceRange.includes("budget") ? "budget"
          : priceRange.includes("mid") ? "mid"
          : priceRange.includes("premium") ? "premium"
          : "luxury",
        country,
      });
      competitors = competitorData.competitors
        .map((c: { name: string; presentOn: string[] }) => `${c.name} (on ${c.presentOn.join(", ")})`)
        .join("; ");
      marketTrend = competitorData.marketTrend;
    } catch { /* use defaults */ }

    const roi = calculateROI({
      catalogueSize,
      eligibleMarketplaces: eligibleParts.length || 3,
      category,
      priceRange: priceRange.includes("budget") ? "budget"
        : priceRange.includes("mid") ? "mid"
        : priceRange.includes("premium") ? "premium"
        : "luxury",
    });

    // Compute timing label from strategy gaps or passed mailTiming
    const gap1 = strategy?.emailGap1Days ?? 5;
    const gap2 = strategy?.emailGap2Days ?? 7;
    const timingLabels = [
      `J0`,
      `J+${gap1}`,
      `J+${gap1 + gap2}`,
    ];
    const timing = mailTiming || timingLabels[mailNumber - 1];

    const email = await generateEmail({
      sellerName: seller.seller_name,
      category,
      country,
      priceRange,
      matchScore: seller.match_score || 0,
      topMarketplace: marketplace,
      eligibleMarketplaces: eligibleParts.join(", ") || marketplace,
      matchRationale,
      competitors,
      marketTrend,
      roiEstimate: formatROIForEmail(roi),
      contactName,
      contactJobTitle,
      mailNumber: mailNumber as 1 | 2 | 3,
      mailTiming: timing,
      strategy: strategy || undefined,
      customInstructions: typeof customInstructions === "string" ? customInstructions : undefined,
    });

    return Response.json({
      ...email,
      timing,
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
    return Response.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
