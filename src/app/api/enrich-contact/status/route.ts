import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

const BC_BASE = "https://app.bettercontact.rocks/api/v2";

const EMAIL_STATUS_CONFIDENCE: Record<string, number> = {
  valid: 95,
  catch_all_safe: 75,
  catch_all_not_safe: 55,
  undeliverable: 30,
};

// GET /api/enrich-contact/status?taskId=xxx&sellerId=yyy
// Client polls this while the Better Contact task is still "in progress".
// When it terminates, we persist the result to Supabase if sellerId is provided.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const sellerId = searchParams.get("sellerId");
    if (!taskId) {
      return Response.json({ error: "taskId requis" }, { status: 400 });
    }
    const key = process.env.BETTERCONTACT_API_KEY;
    if (!key) {
      return Response.json({ error: "BETTERCONTACT_API_KEY manquante" }, { status: 500 });
    }

    const res = await fetch(`${BC_BASE}/async/${taskId}`, {
      headers: { "X-API-Key": key },
    });
    const json = await res.json();
    const status = json.status;

    if (status !== "terminated") {
      return Response.json({ pending: true, status });
    }

    const result = json.data?.[0] || null;
    const email = result?.contact_email_address || null;
    const emailStatus = result?.contact_email_address_status || "";
    const confidence = email ? EMAIL_STATUS_CONFIDENCE[emailStatus] ?? 40 : 0;

    if (sellerId && result) {
      const update: Record<string, unknown> = {
        enriched_at: new Date().toISOString(),
      };
      if (email) {
        update.contact_email = email;
        update.contact_confidence = confidence;
      }
      if (result.contact_full_name) update.contact_name = result.contact_full_name;
      if (result.contact_job_title) update.contact_job_title = result.contact_job_title;
      if (result.contact_linkedin_profile_url) {
        update.contact_linkedin = result.contact_linkedin_profile_url;
      }
      await supabase.from("sellers").update(update).eq("id", sellerId);
    }

    return Response.json({
      pending: false,
      status,
      enriched: Boolean(email),
      contact: result
        ? {
            email,
            emailStatus,
            confidence,
            name: result.contact_full_name || null,
            jobTitle: result.contact_job_title || null,
            linkedin: result.contact_linkedin_profile_url || null,
          }
        : null,
    });
  } catch (error) {
    console.error("enrich-contact/status error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur polling" },
      { status: 500 }
    );
  }
}
