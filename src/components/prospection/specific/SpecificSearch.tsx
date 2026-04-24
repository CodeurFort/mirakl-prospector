"use client";

import { useState } from "react";
import type { MarketplaceRecommendation, ProspectionMode } from "@/lib/types";
import { computeCriteria } from "@/lib/bdr-engine";
import { ModeToggle } from "../ModeToggle";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useT } from "@/lib/i18n";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const transferToOutreach = useWorkspaceStore((s) => s.transferToOutreach);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const t = useT();

  async function handleScrape(event: React.FormEvent) {
    event.preventDefault();
    if (!brandName.trim()) return;

    setStatus("scraping");
    setRecommendations([]);
    setStatusMessage(null);
    setScrapedData(null);
    setOutOfScope(null);
    setSellerId(null);
    setSelectedIds(new Set());

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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isLoading = status === "scraping";

  return (
    <div className="p-4 pt-[68px] lg:p-8 lg:pt-6 pb-16 lg:pb-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFF0F5", color: "#F22E75" }}>
              {t("specific.badge")}
            </span>
          </div>
          <h1 className="font-bold" style={{ fontSize: 24, lineHeight: "34px", color: "#03182F" }}>
            {t("specific.title")}
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#425063" }}>
            {t("specific.subtitle")}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      <form onSubmit={handleScrape} className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="mirakl-card-elevated rounded-[28px] p-5">
          <div className="space-y-5">
            <div>
              <FieldHeader label={t("specific.brand_name")} hint={t("specific.brand_name_hint")} />
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={t("specific.brand_name_placeholder")}
                className="w-full rounded-2xl border px-4 py-3 text-[14px] outline-none"
                style={{ borderColor: "#D6DEE8", color: "#03182F" }}
              />
            </div>
            <div>
              <FieldHeader label={t("specific.domain")} hint={t("specific.domain_hint")} />
              <input
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder={t("specific.domain_placeholder")}
                className="w-full rounded-2xl border px-4 py-3 text-[14px] outline-none"
                style={{ borderColor: "#D6DEE8", color: "#03182F" }}
              />
            </div>
            <div>
              <FieldHeader label={t("specific.roles")} hint={t("specific.roles_hint")} />
              <RolePicker value={roles} onChange={setRoles} />
            </div>

            <div className="rounded-2xl p-4" style={{ background: "#F7FAFD", border: "1px solid #E2E8F0" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
                {t("specific.pipeline")}
              </p>
              <ol className="mt-2 space-y-1.5">
                {[
                  t("specific.pipeline.step1"),
                  t("specific.pipeline.step2"),
                  t("specific.pipeline.step3"),
                  t("specific.pipeline.step4"),
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
              {isLoading ? t("specific.scraping") : t("specific.cta")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading && (
            <div className="mirakl-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#2764FF] border-t-transparent animate-spin shrink-0" />
              <div>
                <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>
                  {t("specific.scraping")} {brandName}…
                </p>
                <p className="text-[12px]" style={{ color: "#6B7280" }}>
                  {t("specific.scraping_hint", { n: 7 })}
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
                    {t("specific.outofscope.title")}
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "#7F1D1D" }}>
                    {outOfScope.reason}
                  </p>
                  <p className="mt-2 text-[12px]" style={{ color: "#7F1D1D" }}>
                    {t("specific.outofscope.hint")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {scrapedData && (
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "#D6DEE8", background: "#FFFFFF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#6F7F90" }}>
                {t("specific.detected_profile")}
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
                <MetricCard label={t("specific.marketplaces_total")} value={stats.total} />
                <MetricCard label={t("specific.avg_score")} value={stats.avg} />
                <MetricCard label={t("specific.high_priority")} value={stats.high} accent="#B42318" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px]" style={{ color: "#4C5B6D" }}>
                  {t("specific.selected_count", { n: selectedIds.size })}
                </p>
                {sellerId && (
                  <button
                    type="button"
                    disabled={pushingOutreach}
                    onClick={handlePushToOutreach}
                    className="rounded-2xl px-4 py-2.5 text-[13px] font-bold disabled:opacity-50"
                    style={{ background: "#03182F", color: "#FFFFFF" }}
                  >
                    {pushingOutreach ? t("specific.push_loading") : t("specific.push_outreach")}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <MarketplaceRecommendationCard
                    key={rec.marketplaceId}
                    recommendation={rec}
                    selected={selectedIds.has(rec.marketplaceId)}
                    onToggle={() => toggleSelection(rec.marketplaceId)}
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
              <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>{t("specific.empty_title")}</p>
              <p className="mt-1 text-[13px]" style={{ color: "#6B7280" }}>
                {t("specific.empty_hint")}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
