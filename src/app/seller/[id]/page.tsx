"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ScoreRadar = dynamic(() => import("@/components/ScoreRadar"), { ssr: false });

interface SellerData {
  id: string;
  seller_name: string;
  match_score: number;
  match_rationale: string;
  catalogue_size: string;
  amazon_presence: boolean;
  amazon_product_count: number;
  category?: { label: string };
  country?: { code: string; label: string };
  price_category?: { label: string };
  distribution_type?: { label: string };
  marketplace?: { "marketplace name": string };
}

interface GeneratedEmail {
  subject: string;
  body: string;
  timing: string;
  mailNumber: number;
  roi?: {
    timesSavedPerMonth: number;
    costWithoutMirakl: number;
    costWithMirakl: number;
    monthlySavings: number;
    revenueUpliftPercent: string;
    eligibleMarketplaces: number;
  };
}

export default function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [emails, setEmails] = useState<(GeneratedEmail | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [generatingMail, setGeneratingMail] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sellers`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.sellers?.find((s: SellerData) => s.id === id);
        setSeller(found || null);
        setLoading(false);
      });
  }, [id]);

  async function generateMail(mailNumber: 1 | 2 | 3) {
    setGeneratingMail(mailNumber);
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: id, mailNumber }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmails((prev) => {
        const next = [...prev];
        next[mailNumber - 1] = data;
        return next;
      });
      setActiveTab(mailNumber);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingMail(null);
    }
  }

  async function generateAllMails() {
    for (const n of [1, 2, 3] as const) {
      await generateMail(n);
    }
  }

  function copyToClipboard(email: GeneratedEmail) {
    const text = `Objet : ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportPDF() {
    if (!seller) return;
    const generatedEmails = emails.filter((e): e is GeneratedEmail => e !== null);
    if (generatedEmails.length === 0) return;

    const timingLabels: Record<number, string> = {
      1: "J0 — Accroche concurrentielle",
      2: "J+5 — ROI chiffré",
      3: "J+12 — Closing",
    };

    const roiEmail = emails[1];
    const roiSection = roiEmail?.roi
      ? `
        <div style="margin-top:32px;padding:24px;background:#F2F8FF;border-radius:8px;">
          <h3 style="font-size:16px;color:#03182F;margin:0 0 16px 0;">Résumé ROI</h3>
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:11px;color:#6B7280;font-weight:700;">Temps économisé</div>
              <div style="font-size:22px;font-weight:700;color:#2764FF;margin-top:4px;">${roiEmail.roi.timesSavedPerMonth}h</div>
              <div style="font-size:11px;color:#6B7280;">/mois</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:11px;color:#6B7280;font-weight:700;">Coût sans Mirakl</div>
              <div style="font-size:22px;font-weight:700;color:#F22E75;margin-top:4px;">${roiEmail.roi.costWithoutMirakl}€</div>
              <div style="font-size:11px;color:#6B7280;">/mois</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:11px;color:#6B7280;font-weight:700;">Avec Mirakl Connect</div>
              <div style="font-size:22px;font-weight:700;color:#2E7D32;margin-top:4px;">${roiEmail.roi.costWithMirakl}€</div>
              <div style="font-size:11px;color:#6B7280;">/mois</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:11px;color:#6B7280;font-weight:700;">Uplift CA</div>
              <div style="font-size:22px;font-weight:700;color:#2764FF;margin-top:4px;">${roiEmail.roi.revenueUpliftPercent}</div>
              <div style="font-size:11px;color:#6B7280;">an 1</div>
            </div>
          </div>
        </div>`
      : "";

    const emailsHTML = generatedEmails
      .map(
        (email) => `
        <div style="margin-top:32px;">
          <div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:8px;">
            ${timingLabels[email.mailNumber] || `Mail ${email.mailNumber}`}
          </div>
          <div style="font-size:14px;font-weight:700;color:#03182F;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #D4E4FF;">
            Objet : ${email.subject}
          </div>
          <div style="font-size:14px;line-height:1.7;color:#30373E;white-space:pre-wrap;">${email.body}</div>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin-top:24px;" />
        </div>`
      )
      .join("");

    const today = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Séquence de prospection — ${seller.seller_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Serif:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Roboto Serif', Georgia, serif; color: #30373E; padding: 48px; max-width: 800px; margin: 0 auto; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #03182F;">
    <div style="width:40px;height:40px;background:#03182F;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-size:20px;font-weight:700;">M</div>
    <div>
      <div style="font-size:18px;font-weight:700;color:#03182F;">Mirakl Connect Prospector</div>
      <div style="font-size:12px;color:#6B7280;">Séquence de prospection personnalisée</div>
    </div>
  </div>

  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px;">
    <div style="font-size:20px;font-weight:700;color:#03182F;">${seller.seller_name}</div>
  </div>
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:32px;">
    <span style="font-size:12px;color:#6B7280;">Catégorie : <strong style="color:#03182F;">${seller.category?.label || "—"}</strong></span>
    <span style="font-size:12px;color:#6B7280;">Pays : <strong style="color:#03182F;">${seller.country?.code || "—"}</strong></span>
    <span style="font-size:12px;color:#6B7280;">Score : <strong style="color:#2764FF;">${score}/100</strong></span>
  </div>

  ${emailsHTML}
  ${roiSection}

  <div style="margin-top:48px;padding-top:16px;border-top:2px solid #E2E8F0;font-size:11px;color:#6B7280;text-align:center;">
    Généré par Mirakl Connect Prospector — ${today}
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-shimmer h-8 w-48 rounded mb-4" />
        <div className="animate-shimmer h-64 rounded-lg" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="p-8">
        <p style={{ color: "#6B7280" }}>Seller non trouvé</p>
        <Link href="/" style={{ color: "#2764FF" }} className="mt-2 inline-block font-bold text-[14px]">
          Retour au dashboard
        </Link>
      </div>
    );
  }

  const score = seller.match_score || 0;
  const priority = score >= 70 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  const priorityStyle =
    priority === "HIGH"
      ? { bg: "#E8F5E9", color: "#2E7D32" }
      : priority === "MEDIUM"
        ? { bg: "#FFF3E0", color: "#E65100" }
        : { bg: "#FFE7EC", color: "#770031" };

  // Parse rationale for marketplace scores
  const mpScores = (seller.match_rationale || "")
    .split("|")
    .filter((p) => !p.includes("Already on") && p.includes(":"))
    .map((p) => {
      const [name, val] = p.trim().split(":");
      return { name: name?.trim(), score: parseFloat(val?.trim() || "0") };
    })
    .filter((m) => m.name && !isNaN(m.score));

  return (
    <div className="p-4 pt-[68px] lg:pt-4 lg:p-8" style={{ maxWidth: 1000 }}>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] font-bold mb-4 lg:mb-6"
        style={{ color: "#2764FF" }}
      >
        ← Dashboard
      </Link>

      {/* Seller header card */}
      <div className="mirakl-card-elevated p-4 lg:p-6 mb-4 lg:mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F" }}>
              {seller.seller_name}
            </h1>
            <div className="flex gap-4 mt-3 flex-wrap">
              <InfoChip label="Catégorie" value={seller.category?.label || "—"} />
              <InfoChip label="Pays" value={seller.country?.code || "—"} />
              <InfoChip label="Prix" value={seller.price_category?.label || "—"} />
              <InfoChip label="Catalogue" value={seller.catalogue_size || "—"} />
              <InfoChip label="Distribution" value={seller.distribution_type?.label || "—"} />
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[36px] font-bold" style={{ color: "#2764FF" }}>
                {score}
              </span>
              <span className="text-[16px]" style={{ color: "#6B7280" }}>/100</span>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[12px] font-bold"
              style={{ background: priorityStyle.bg, color: priorityStyle.color }}
            >
              {priority} PRIORITY
            </span>
          </div>
        </div>

        {/* Best match + Amazon */}
        <div className="flex gap-3 mt-4">
          <span
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            Best match : {seller.marketplace?.["marketplace name"] || "—"}
          </span>
          {seller.amazon_presence && (
            <span
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
              style={{ background: "#E8F5E9", color: "#2E7D32" }}
            >
              Amazon FR : {seller.amazon_product_count} produits
            </span>
          )}
        </div>

        {/* Per-marketplace scores with radar */}
        {mpScores.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid #E2E8F0" }}>
            <p className="text-[12px] font-bold mb-3" style={{ color: "#03182F" }}>
              Compatibilité par marketplace
            </p>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
              {/* Radar chart */}
              <div className="shrink-0">
                <ScoreRadar scores={mpScores} size={220} />
              </div>
              {/* Score cards */}
              <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-3 gap-2">
                {mpScores.map((mp) => {
                  const c = mp.score >= 70 ? "#2764FF" : mp.score >= 50 ? "#E65100" : "#770031";
                  return (
                    <div key={mp.name} className="rounded-lg p-3"
                      style={{ background: mp.score >= 70 ? "#F2F8FF" : mp.score >= 50 ? "#FFF9F0" : "#FFF5F5" }}>
                      <p className="text-[10px] font-bold truncate" style={{ color: "#6B7280" }}>{mp.name}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-[20px] font-bold" style={{ color: c }}>{mp.score}</span>
                        <span className="text-[10px]" style={{ color: "#6B7280" }}>/100</span>
                      </div>
                      <div className="mt-1.5 h-[3px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                        <div className="h-full rounded-full" style={{ width: `${mp.score}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email generation section */}
      <div className="mirakl-card-elevated overflow-hidden animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: "2px solid #E2E8F0" }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, lineHeight: "28px", color: "#03182F" }}>
              Séquence de prospection
            </h2>
            <p className="text-[14px] mt-1" style={{ color: "#30373E" }}>
              3 mails personnalisés générés par GPT-4o
            </p>
          </div>
          <div className="flex gap-2">
            {emails.some((e) => e !== null) && (
              <button
                onClick={exportPDF}
                className="px-4 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-md"
                style={{ border: "1px solid #03182F", color: "#03182F" }}
              >
                Exporter PDF
              </button>
            )}
            <button
              onClick={generateAllMails}
              disabled={generatingMail !== null}
              className="px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-lg disabled:opacity-50"
              style={{ background: "#2764FF", color: "#FFFFFF" }}
            >
              {generatingMail !== null ? `Génération mail ${generatingMail}...` : "Générer les 3 mails"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid #E2E8F0" }}>
          {[
            { n: 1, label: "Accroche", timing: "J0" },
            { n: 2, label: "ROI", timing: "J+5" },
            { n: 3, label: "Closing", timing: "J+12" },
          ].map(({ n, label, timing }) => (
            <button
              key={n}
              onClick={() => setActiveTab(n)}
              className="flex-1 min-w-0 px-2 lg:px-4 py-3 text-[12px] lg:text-[14px] font-bold transition-all relative"
              style={{
                color: activeTab === n ? "#2764FF" : "#6B7280",
                background: activeTab === n ? "#F2F8FF" : "transparent",
              }}
            >
              <span className="text-[11px] font-normal block" style={{ color: "#6B7280" }}>
                {timing}
              </span>
              Mail {n} — {label}
              {emails[n - 1] && (
                <span className="ml-1.5 text-[10px]" style={{ color: "#2E7D32" }}>
                  ✓
                </span>
              )}
              {activeTab === n && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{ background: "#2764FF" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Email content */}
        <div className="p-6">
          {emails[activeTab - 1] ? (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold" style={{ color: "#6B7280" }}>
                  {emails[activeTab - 1]!.timing}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateMail(activeTab as 1 | 2 | 3)}
                    disabled={generatingMail !== null}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors disabled:opacity-50"
                    style={{ border: "1px solid #E2E8F0", color: "#03182F" }}
                  >
                    Regénérer
                  </button>
                  <button
                    onClick={() => copyToClipboard(emails[activeTab - 1]!)}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all"
                    style={{ background: "#03182F", color: "#FFFFFF" }}
                  >
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </div>
              </div>
              <div className="rounded-lg p-6" style={{ background: "#F2F8FF" }}>
                <p
                  className="font-bold mb-4 pb-3"
                  style={{ fontSize: 14, color: "#03182F", borderBottom: "1px solid #D4E4FF" }}
                >
                  Objet : {emails[activeTab - 1]!.subject}
                </p>
                <div
                  className="text-[14px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#30373E" }}
                >
                  {emails[activeTab - 1]!.body}
                </div>
              </div>

              {/* ROI cards for mail 2 */}
              {activeTab === 2 && emails[1]?.roi && (
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <ROICard label="Temps économisé" value={`${emails[1].roi.timesSavedPerMonth}h`} sub="/mois" color="#2764FF" />
                  <ROICard label="Coût sans Mirakl" value={`${emails[1].roi.costWithoutMirakl}€`} sub="/mois" color="#F22E75" />
                  <ROICard label="Avec Mirakl Connect" value={`${emails[1].roi.costWithMirakl}€`} sub="/mois" color="#2E7D32" />
                  <ROICard label="Uplift CA" value={emails[1].roi.revenueUpliftPercent} sub="an 1" color="#2764FF" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              {generatingMail === activeTab ? (
                <div className="animate-fade-in">
                  <div
                    className="inline-block w-10 h-10 border-3 rounded-full animate-spin mb-4"
                    style={{ borderColor: "#E2E8F0", borderTopColor: "#2764FF" }}
                  />
                  <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>
                    Génération du mail {activeTab} en cours...
                  </p>
                  <p className="text-[12px] mt-2" style={{ color: "#6B7280" }}>
                    Analyse concurrentielle + calcul ROI personnalisé...
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[14px] mb-4" style={{ color: "#6B7280" }}>
                    Mail non encore généré
                  </p>
                  <button
                    onClick={() => generateMail(activeTab as 1 | 2 | 3)}
                    className="px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-lg"
                    style={{ background: "#2764FF", color: "#FFFFFF" }}
                  >
                    Générer le mail {activeTab}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg" style={{ background: "#F2F8FF" }}>
      <span className="text-[11px]" style={{ color: "#6B7280" }}>
        {label} :{" "}
      </span>
      <span className="text-[13px] font-bold" style={{ color: "#03182F" }}>
        {value}
      </span>
    </div>
  );
}

function ROICard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="mirakl-card p-4 text-center">
      <p className="text-[11px] font-bold" style={{ color: "#6B7280" }}>
        {label}
      </p>
      <p className="text-[22px] font-bold mt-1" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "#6B7280" }}>
        {sub}
      </p>
    </div>
  );
}
