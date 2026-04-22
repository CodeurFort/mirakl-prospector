import { NextRequest } from "next/server";
import { getSellers, getMarketplaces, getCategories } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketplace = searchParams.get("marketplace") || undefined;
  const category = searchParams.get("category") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const [sellers, marketplaces, categories] = await Promise.all([
      getSellers({ marketplace, category, priority, search }),
      getMarketplaces(),
      getCategories(),
    ]);

    return Response.json({ sellers, marketplaces, categories });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return Response.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
