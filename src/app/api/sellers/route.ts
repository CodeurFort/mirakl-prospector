import { NextRequest } from "next/server";
import {
  getCategories,
  getCountries,
  getCustomerCategories,
  getDistributionTypes,
  getMarketplaces,
  getPriceCategories,
  getSellers,
} from "@/lib/supabase";
import { getMarketplaceProfiles } from "@/lib/supabase-matching";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketplace = searchParams.get("marketplace") || undefined;
  const category = searchParams.get("category") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const search = searchParams.get("search") || undefined;
  const catalogueSize = searchParams.get("catalogueSize") || undefined;
  const priceCategory = searchParams.get("priceCategory") || undefined;
  const customerCategory = searchParams.get("customerCategory") || undefined;
  const country = searchParams.get("country") || undefined;
  const amazonPresence =
    (searchParams.get("amazonPresence") as "yes" | "no" | null) || undefined;
  const distributionType = searchParams.get("distributionType") || undefined;

  try {
    const [
      sellers,
      marketplaces,
      categories,
      countries,
      priceCategories,
      customerCategories,
      distributionTypes,
      matching,
    ] = await Promise.all([
      getSellers({
        marketplace,
        category,
        priority,
        search,
        catalogueSize,
        priceCategory,
        customerCategory,
        country,
        amazonPresence,
        distributionType,
      }),
      getMarketplaces(),
      getCategories(),
      getCountries(),
      getPriceCategories(),
      getCustomerCategories(),
      getDistributionTypes(),
      getMarketplaceProfiles(),
    ]);

    const catalogueSizes = Array.from(
      new Set((sellers || []).map((seller) => seller.catalogue_size).filter(Boolean))
    );

    return Response.json({
      sellers,
      marketplaces,
      categories,
      countries,
      priceCategories,
      customerCategories,
      distributionTypes,
      catalogueSizes,
      matchingProfiles: matching.profiles,
      matchingSource: matching.source,
      matchingMessage: matching.message,
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return Response.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
