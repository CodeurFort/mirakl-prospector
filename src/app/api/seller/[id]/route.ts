import { NextRequest } from "next/server";
import { getSellerById } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seller = await getSellerById(id);
    if (!seller) {
      return Response.json({ error: "Seller introuvable" }, { status: 404 });
    }
    return Response.json(seller);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
