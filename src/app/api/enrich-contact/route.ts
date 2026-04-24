import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const BC_BASE = "https://app.bettercontact.rocks/api/v2";
const POLL_INTERVAL_MS = 6000;
const POLL_TIMEOUT_MS = 48_000; // leave ~12s headroom below Vercel's 60s cap

interface BetterContactResult {
  contact_email_address?: string | null;
  contact_email_address_status?: string | null;
  contact_full_name?: string | null;
  contact_job_title?: string | null;
  contact_linkedin_profile_url?: string | null;
  company_employees_number?: number | null;
}

interface BetterContactResponse {
  id?: string;
  status?: string;
  credits_left?: number;
  data?: BetterContactResult[];
}

const EMAIL_STATUS_CONFIDENCE: Record<string, number> = {
  valid: 95,
  catch_all_safe: 75,
  catch_all_not_safe: 55,
  undeliverable: 30,
};

function cleanDomain(raw: string): string {
  if (!raw) return "";
  let d = raw.trim().toLowerCase();
  for (const prefix of ["https://www.", "http://www.", "https://", "http://", "www."]) {
    if (d.startsWith(prefix)) {
      d = d.slice(prefix.length);
      break;
    }
  }
  return d.replace(/\/+$/, "").split("/")[0];
}

// Primary + fallback BC keys. The fallback is used only when the primary
// fails with an auth/credits error — never for transient network issues.
function bcKeys(): string[] {
  const keys = [
    process.env.BETTERCONTACT_API_KEY,
    process.env.BETTERCONTACT_API_KEY_FALLBACK,
  ].filter((k): k is string => Boolean(k));
  if (keys.length === 0) throw new Error("BETTERCONTACT_API_KEY manquante");
  return keys;
}

function looksLikeCreditsOrAuthError(httpStatus: number, body: unknown): boolean {
  if (httpStatus === 401 || httpStatus === 402 || httpStatus === 403) return true;
  if (typeof body === "object" && body !== null) {
    const message = JSON.stringify(body).toLowerCase();
    return (
      message.includes("credit") ||
      message.includes("insufficient") ||
      message.includes("quota") ||
      message.includes("unauthorized") ||
      message.includes("invalid api key")
    );
  }
  return false;
}

// Map taskId → the key that submitted it, so polling reuses the same key.
const TASK_KEY: Map<string, string> = new Map();

// BC silently queues a task as "on hold" when the key is out of credits — no 402
// is raised. We have to probe the status right after submit to catch that case.
async function bcIsOnHold(key: string, taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BC_BASE}/async/${taskId}`, {
      headers: { "X-API-Key": key },
    });
    const body = (await res.json().catch(() => ({}))) as BetterContactResponse & { message?: string };
    const msg = (body.message || "").toLowerCase();
    return body.status === "on hold" || msg.includes("top-up") || msg.includes("credit");
  } catch {
    return false;
  }
}

async function bcSubmit(payload: {
  first_name?: string;
  last_name?: string;
  company_domain: string;
  company_name?: string;
  linkedin_url?: string;
  job_title?: string;
}): Promise<string | null> {
  const keys = bcKeys();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const res = await fetch(`${BC_BASE}/async`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({
        data: [payload],
        enrich_email_address: true,
        enrich_phone_number: false,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as BetterContactResponse;

    if (!res.ok || !json.id) {
      if (looksLikeCreditsOrAuthError(res.status, json) && i < keys.length - 1) {
        console.warn(`BC key #${i + 1} failed (${res.status}), switching...`);
        continue;
      }
      return null;
    }

    // Silent on-hold detection
    if (await bcIsOnHold(key, json.id) && i < keys.length - 1) {
      console.warn(`BC key #${i + 1} out of credits (task ${json.id} on hold), switching...`);
      continue;
    }

    TASK_KEY.set(json.id, key);
    return json.id;
  }
  return null;
}

async function bcPoll(taskId: string, maxWaitMs: number): Promise<BetterContactResult | null> {
  const key = TASK_KEY.get(taskId) || bcKeys()[0];
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${BC_BASE}/async/${taskId}`, {
      headers: { "X-API-Key": key },
    });
    const json = (await res.json().catch(() => ({}))) as BetterContactResponse;
    if (json.status === "terminated") {
      TASK_KEY.delete(taskId);
      return json.data?.[0] || null;
    }
    // BC returns several in-progress statuses: in progress, pending, processing,
    // on hold, queued. Anything outside that set is a terminal error.
    const IN_PROGRESS = new Set(["in progress", "pending", "processing", "on hold", "queued"]);
    if (json.status && !IN_PROGRESS.has(json.status)) {
      TASK_KEY.delete(taskId);
      return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { seller_id } = await request.json();
    if (!seller_id) {
      return Response.json({ error: "seller_id requis" }, { status: 400 });
    }

    // Load seller with every signal we can feed to Better Contact.
    // BC returns higher-quality emails when it gets linkedin_url + job_title
    // in addition to first/last/domain — it scrapes the LinkedIn profile
    // directly instead of guessing patterns.
    const { data: seller, error: loadError } = await supabase
      .from("sellers")
      .select("id, seller_name, company_domain, contact_name, contact_email, contact_linkedin, contact_job_title")
      .eq("id", seller_id)
      .single();
    if (loadError || !seller) {
      return Response.json({ error: "Seller introuvable" }, { status: 404 });
    }

    const domain = cleanDomain(seller.company_domain || "");
    if (!domain) {
      return Response.json(
        { error: "Domaine manquant — impossible d'enrichir sans domaine." },
        { status: 400 }
      );
    }

    // Build Better Contact payload with every enrichment signal we have
    const payload: {
      first_name?: string;
      last_name?: string;
      company_domain: string;
      company_name?: string;
      linkedin_url?: string;
      job_title?: string;
    } = {
      company_domain: domain,
      company_name: seller.seller_name || undefined,
    };
    const existingName = (seller.contact_name || "").trim();
    if (existingName) {
      const parts = existingName.split(/\s+/);
      payload.first_name = parts[0];
      if (parts.length >= 2) payload.last_name = parts[parts.length - 1];
    }
    if (seller.contact_linkedin) payload.linkedin_url = seller.contact_linkedin;
    if (seller.contact_job_title) payload.job_title = seller.contact_job_title;

    const taskId = await bcSubmit(payload);
    if (!taskId) {
      return Response.json(
        { error: "Better Contact n'a pas retourne de task id — verifier la cle API." },
        { status: 502 }
      );
    }

    const result = await bcPoll(taskId, POLL_TIMEOUT_MS);

    // Timed out without a terminal status — let the client poll /status separately.
    if (!result) {
      return Response.json({
        pending: true,
        taskId,
        message: "Enrichissement en cours. Interroger /api/enrich-contact/status?taskId=... pour le resultat final.",
      });
    }

    // Build Supabase update
    const email = result.contact_email_address || null;
    const emailStatus = result.contact_email_address_status || "";
    const confidence = email
      ? EMAIL_STATUS_CONFIDENCE[emailStatus] ?? 40
      : 0;

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

    await supabase.from("sellers").update(update).eq("id", seller_id);

    return Response.json({
      sellerId: seller_id,
      enriched: Boolean(email),
      contact: {
        email,
        emailStatus,
        confidence,
        name: result.contact_full_name || null,
        jobTitle: result.contact_job_title || null,
        linkedin: result.contact_linkedin_profile_url || null,
      },
    });
  } catch (error) {
    console.error("enrich-contact error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur enrichissement" },
      { status: 500 }
    );
  }
}
