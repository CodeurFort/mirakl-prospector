"use client";

import { useState } from "react";
import type { MarketplaceRecommendation, ProspectionMode } from "@/lib/types";
import { computeCriteria } from "@/lib/bdr-engine";
import { ModeToggle } from "../ModeToggle";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { FieldHeader } from "../shared/FieldHeader";
import { RolePicker } from "../shared/RolePicker";
import { MetricCard } from "@/components/shared/MetricCard";
import { MarketplaceRecommendationCard } from "./MarketplaceRecommendationCard";

interface SpecificSearchProps {
  mode: ProspectionMode;
  onModeChange: (m: ProspectionMode) => void;
}

type ScrapeStatus = "idle" | "scraping" | "done" | "error";

export function SpecificSearch({ mode, onModeChange }: SpecificSearchProps) {
  const [brandName, setBrandName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [roles, setRoles] = useState<string[]>(["Head of Marketplace"]);
  const [status, setStatus] = useState<ScrapeStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MarketplaceRecommendation[]>([]);
  const [stats, setStats] = useState({ total: 0, high: 0, avg: 0 });
  const [scrapedData, setScrapedData] = useState<{
    category?: string;
    country?: string;
    price?: string;
  } | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [pushingOutreach, setPushingOutreach] = useState(false);
  const [outOfScope, setOutOfScope] = useState<{ reason: string } | null>(null);

  const transferToOutreach = useWorkspaceStore((s) => s.transferToOutreach);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);

  async function handleScrape(event: React.FormEvent) {
    event.preventDefault();
    if (!brandName.trim()) return;

    setStatus("scraping");
    setRecommendations([]);
    setStatusMessage(null);
    setScrapedData(null);
    setOutOfScope(null);
    setSellerId(null);

    try {
      const res = await fetch("/api/scrape-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName.trim(), domain: companyDomain.trim(), roles }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Out-of-scope brand: no marketplace recommendations, no DB write
      if (data.outOfScope) {
        setOutOfScope({ reason: data.reason || data.message || "Marque hors scope Mirakl Fashion." });
        setStatusMessage(data.message || null);
        setStatus("done");
        return;
      }

      const nextRecommendations: MarketplaceRecommendation[] = data.recommendations || [];
      setRecommendations(nextRecommendations);
      setScrapedData(data.sellerProfile || null);
      setSellerId(data.sellerId || null);
      setStatusMessage(data.message || null);
      setStats({
        total: nextRecommendations.length,
        high: nextRecommendations.filter((r) => r.priority === "HOT" || r.priority === "HIGH").length,
        avg: nextRecommendations.length > 0
          ? Math.round(nextRecommendations.reduce((s, r) => s + r.score, 0) / nextRecommendations.length)
          : 0,
      });

      setStatus("done");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Erreur scraping");
      setStatus("error");
    }
  }

  async function handlePushToOutreach() {
    if (!sellerId) return;
    setPushingOutreach(true);
    try {
      const [sellerRes, sellersRes] = await Promise.all([
        fetch(`/api/seller/${sellerId}`),
        fetch("/api/sellers"),
      ]);
      const seller = await sellerRes.json();
      if (!seller || seller.error) throw new Error("Seller introuvable");

      const payload = await sellersRes.json();
      const profiles = payload.matchingProfiles || [];

      const snapshot = computeCriteria(seller, profiles);
      transferToOutreach({
        seller: snapshot.seller,
        totalScore: snapshot.totalScore,
        priority: snapshot.priority,
        reasoningText: snapshot.reasoningText,
        scoreBreakdown: snapshot.scoreBreakdown,
        signals: snapshot.signals,
        strategy: snapshot.strategy,
        recommendedContact: snapshot.recommendedContact,
        operatorScores: snapshot.operatorScores,
        topRecommendation: snapshot.topRecommendation,
        contacts: [],
        source: "bulk",
      });
      setActiveTab("outreach");
    } catch (err) {
      console.error(err);
    } finally {
      setPushingOutreach(false);
    }
  }

  const selectedIds = new Set<string>();

  const isLoading = status === "scraping";

  return (
    <div className="p-4 pt-[68px] lg:p-8 lg:pt-6 pb-16 lg:pb-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFF0F5", color: "#F22E75" }}>
              PAR VENDEUR
            </span>
          </div>
          <h1 className="font-bold" style={{ fontSize: 24, lineHeight: "34px", color: "#03182F" }}>
            Scraping & scoring d'un vendeur
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#425063" }}>
            Entrez le nom de marque et le domaine — le scraper Python enrichit et score les marketplaces les plus adaptées.
          </p>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      <form onSubmit={handleScrape} className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="mirakl-card-elevated rounded-[28px] p-5">
          <div className="space-y-5">
            <div>
              <FieldHeader label="Nom de marque" hint="Nom exact du vendeur à analyser." />
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: AGMES"
                className="w-full rounded-2xl border px-4 py-3 text-[14px] outline-none"
                style={{ borderColor: "#D6DEE8", color: "#03182F" }}
              />
            </div>
            <div>
              <FieldHeader label="Domaine" hint="Domaine du site vendeur — utilisé pour le scraping et le profiling." />
              <input
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder="Ex: agmesnyc.com"
                className="w-full rounded-2xl border px-4 py-3 text-[14px] outline-none"
                style={{ borderColor: "#D6DEE8", color: "#03182F" }}
              />
            </div>
            <div>
              <FieldHeader label="Rôles à cibler" hint="Contacts prioritaires pour l'outreach à venir." />
              <RolePicker value={roles} onChange={setRoles} />
            </div>

            <div className="rounded-2xl p-4" style={{ background: "#F7FAFD", border: "1px solid #E2E8F0" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
                Pipeline
              </p>
              <ol className="mt-2 space-y-1.5">
                {[
                  "Inférence pays via TLD domaine",
                  "Profiling catégorie & prix (web search)",
                  "Scoring contre 7 marketplaces",
                  "Insertion en Supabase sellers",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "#425063" }}>
                    <span className="mt-0.5 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0" style={{ background: "#2764FF", color: "#fff" }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="submit"
              disabled={isLoading || !brandName.trim()}
              className="w-full rounded-2xl px-4 py-3 text-[14px] font-bold disabled:opacity-50"
              style={{ background: "#F22E75", color: "#FFFFFF" }}
            >
              {isLoading ? "Scraping en cours..." : "Lancer le scraping"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading && (
            <div className="mirakl-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#2764FF] border-t-transparent animate-spin shrink-0" />
              <div>
                <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>
                  Scraping {brandName}...
                </p>
                <p className="text-[12px]" style={{ color: "#6B7280" }}>
                  Inférence domaine → profiling → scoring 7 marketplaces
                </p>
              </div>
            </div>
          )}

          {status === "error" && statusMessage && (
            <div className="rounded-2xl border px-4 py-3 text-[13px]" style={{ borderColor: "#FECACA", background: "#FFF5F5", color: "#B42318" }}>
              {statusMessage}
            </div>
          )}

          {outOfScope && (
            <div className="rounded-2xl border px-5 py-4" style={{ borderColor: "#FECACA", background: "#FFF5F5" }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "#B42318", color: "#FFF" }}>
                  <span className="text-[12px] font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold" style={{ color: "#B42318" }}>
                    Marque hors scope Mirakl Fashion
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "#7F1D1D" }}>
                    {outOfScope.reason}
                  </p>
                  <p className="mt-2 text-[12px]" style={{ color: "#7F1D1D" }}>
                    Aucune recommandation marketplace generee et aucune ligne ajoutee en Supabase. Essayez avec une marque mode, beaute, accessoires, sport, enfant ou luxe.
                  </p>
                </div>
              </div>
            </div>
          )}

          {scrapedData && (
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "#D6DEE8", background: "#FFFFFF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#6F7F90" }}>
                Profil détecté
              </p>
              <div className="flex flex-wrap gap-3 text-[13px]">
                {scrapedData.category && (
                  <span className="px-2 py-1 rounded-lg" style={{ background: "#F2F8FF", color: "#2764FF" }}>
                    {scrapedData.category}
                  </span>
                )}
                {scrapedData.country && (
                  <span className="px-2 py-1 rounded-lg" style={{ background: "#F2F8FF", color: "#2764FF" }}>
                    {scrapedData.country}
                  </span>
                )}
                {scrapedData.price && (
                  <span className="px-2 py-1 rounded-lg" style={{ background: "#F2F8FF", color: "#2764FF" }}>
                    {scrapedData.price}
                  </span>
                )}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Marketplaces analysées" value={stats.total} />
                <MetricCard label="Score moyen" value={stats.avg} />
                <MetricCard label="High priority" value={stats.high} accent="#B42318" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px]" style={{ color: "#4C5B6D" }}>
                  {selectedIds.size} marketplace(s) sélectionnée(s)
                </p>
                {sellerId && (
                  <button
                    type="button"
                    disabled={pushingOutreach}
                    onClick={handlePushToOutreach}
                    className="rounded-2xl px-4 py-2.5 text-[13px] font-bold disabled:opacity-50"
                    style={{ background: "#03182F", color: "#FFFFFF" }}
                  >
                    {pushingOutreach ? "Chargement..." : "Push Outreach + Pipeline"}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <MarketplaceRecommendationCard
                    key={rec.marketplaceId}
                    recommendation={rec}
                    selected={selectedIds.has(rec.marketplaceId)}
                    onToggle={() => undefined}
                  />
                ))}
              </div>
            </>
          )}

          {status === "idle" && (
            <div className="rounded-3xl border bg-white p-8 text-center" style={{ borderColor: "#E2E8F0" }}>
              <div className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#FFF0F5" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F22E75" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>Aucun seller analysé</p>
              <p className="mt-1 text-[13px]" style={{ color: "#6B7280" }}>
                Entrez un nom de marque et son domaine pour lancer le scraping
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
