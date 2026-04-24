import { NextRequest } from "next/server";

const N8N_WEBHOOK = "https://hackathon-mirakle.app.n8n.cloud/webhook/70d1a81b-dc60-4156-9a63-f641fc264beb";

export async function POST(request: NextRequest) {
  try {
    const { company_domain, seller_name, seller_id } = await request.json();

    if (!company_domain) {
      return Response.json({ error: "company_domain requis" }, { status: 400 });
    }

    const res = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_domain, seller_name, seller_id }),
    });

    const text = await res.text().catch(() => "");
    // n8n peut retourner 500 si le nœud "Respond to Webhook" n'est pas connecté
    // mais le workflow s'exécute quand même — on considère ça comme un succès
    if (!res.ok && res.status !== 500) {
      return Response.json({ error: `n8n error ${res.status}: ${text}` }, { status: 502 });
    }

    return Response.json({ success: true, company_domain });
  } catch (error) {
    console.error("enrich error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur enrichissement" },
      { status: 500 }
    );
  }
}
