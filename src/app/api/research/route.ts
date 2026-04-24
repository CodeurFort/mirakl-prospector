import { NextRequest } from "next/server";
import { analyzeBrandProfile } from "@/lib/openai";
import { computeBrandToMarketplaceRanking } from "@/lib/bdr-engine";
import { getMatchingResults } from "@/lib/supabase-matching";
import type { MatchingBrandProfile } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { brandName, domain } = await request.json();

    if (!brandName) {
      return Response.json({ error: "brandName required" }, { status: 400 });
    }

    const matching = await getMatchingResults(brandName, domain || "");

    let brandProfile: MatchingBrandProfile;
    try {
      brandProfile = await analyzeBrandProfile({
        brandName,
        companyDomain: domain,
      });
    } catch {
      brandProfile = {
        brandName,
        companyDomain: domain || "",
        focusCategories: ["fashion"],
        priceBands: ["mid"],
        targetCountries: ["FR"],
        customerPositioning: ["unisex"],
        catalogueExpectation: ["medium"],
        distributionModel: ["mono-brand"],
        seasonalMoments: ["always_on"],
      };
    }

    const recommendations = computeBrandToMarketplaceRanking(
      brandProfile,
      matching.profiles
    );

    return Response.json({
      brandProfile,
      recommendations,
      totalMarketplaces: recommendations.length,
      averageScore:
        recommendations.length > 0
          ? Math.round(
              recommendations.reduce((total, item) => total + item.score, 0) /
                recommendations.length
            )
          : 0,
      highPriority: recommendations.filter(
        (item) => item.priority === "HOT" || item.priority === "HIGH"
      ).length,
      source: matching.source,
      message: matching.message,
    });
  } catch (error) {
    console.error("Error in marketplace research:", error);
    return Response.json(
      { error: "Failed to analyze brand matching" },
      { status: 500 }
    );
  }
}
