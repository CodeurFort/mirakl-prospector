"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

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
  const [emails, setEmails] = useState<(GeneratedEmail | null)[]>([
    null,
    null,
    null,
  ]);
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-shimmer h-8 w-48 rounded mb-4" />
        <div className="animate-shimmer h-64 rounded-xl" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="p-8">
        <p className="text-muted">Seller non trouvé</p>
        <Link href="/" className="text-primary mt-2 inline-block">
          Retour au dashboard
        </Link>
      </div>
    );
  }

  const score = seller.match_score || 0;
  const priority =
    score >= 70 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  const priorityColor =
    score >= 70
      ? "text-emerald-600"
      : score >= 50
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="p-8 max-w-5xl">
      {/* Back button */}
      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        ← Dashboard
      </Link>

      {/* Seller header */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{seller.seller_name}</h1>
            <div className="flex gap-4 mt-3 text-sm text-muted">
              <span>
                Catégorie : <strong>{seller.category?.label || "—"}</strong>
              </span>
              <span>
                Pays : <strong>{seller.country?.code || "—"}</strong>
              </span>
              <span>
                Prix : <strong>{seller.price_category?.label || "—"}</strong>
              </span>
              <span>
                Catalogue : <strong>{seller.catalogue_size || "—"}</strong>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${priorityColor}`}>
              {score}
              <span className="text-base font-normal text-muted">/100</span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                priority === "HIGH"
                  ? "bg-emerald-100 text-emerald-700"
                  : priority === "MEDIUM"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {priority}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-3 text-sm">
          <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
            Best match :{" "}
            {seller.marketplace?.["marketplace name"] || "—"}
          </span>
          {seller.amazon_presence && (
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              Amazon FR : {seller.amazon_product_count} produits
            </span>
          )}
        </div>
        {seller.match_rationale && (
          <p className="text-xs text-muted mt-3 font-mono">
            {seller.match_rationale}
          </p>
        )}
      </div>

      {/* Email generation */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Séquence de prospection</h2>
            <p className="text-sm text-muted mt-1">
              3 mails personnalisés générés par IA
            </p>
          </div>
          <button
            onClick={generateAllMails}
            disabled={generatingMail !== null}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {generatingMail !== null
              ? `Génération mail ${generatingMail}...`
              : "Générer les 3 mails"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setActiveTab(n)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === n
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {n === 1 && "Mail 1 — Accroche"}
              {n === 2 && "Mail 2 — ROI"}
              {n === 3 && "Mail 3 — Closing"}
              {emails[n - 1] && " ✓"}
            </button>
          ))}
        </div>

        {/* Email content */}
        <div className="p-6">
          {emails[activeTab - 1] ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted font-medium">
                  {emails[activeTab - 1]!.timing}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateMail(activeTab as 1 | 2 | 3)}
                    disabled={generatingMail !== null}
                    className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Regénérer
                  </button>
                  <button
                    onClick={() => copyToClipboard(emails[activeTab - 1]!)}
                    className="px-3 py-1 text-xs bg-foreground text-background rounded-lg hover:opacity-80 transition-opacity"
                  >
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-5">
                <p className="text-sm font-bold mb-3">
                  Objet : {emails[activeTab - 1]!.subject}
                </p>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {emails[activeTab - 1]!.body}
                </div>
              </div>
              {/* ROI display for mail 2 */}
              {activeTab === 2 && emails[1]?.roi && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted">Temps économisé</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {emails[1].roi.timesSavedPerMonth}h/mois
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted">Économie mensuelle</p>
                    <p className="text-lg font-bold text-amber-600">
                      {emails[1].roi.monthlySavings}€
                    </p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted">Uplift CA potentiel</p>
                    <p className="text-lg font-bold text-primary">
                      {emails[1].roi.revenueUpliftPercent}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              {generatingMail === activeTab ? (
                <div>
                  <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-muted">
                    Génération du mail {activeTab} en cours...
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Analyse des concurrents et calcul du ROI...
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted mb-3">Mail non encore généré</p>
                  <button
                    onClick={() => generateMail(activeTab as 1 | 2 | 3)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-light transition-colors"
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
