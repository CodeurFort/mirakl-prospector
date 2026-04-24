"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type {
  Marketplace,
  MarketplaceProfileRecord,
  ProspectionMode,
  RefCategory,
  RefCountry,
  RefOption,
  Seller,
  SellerIntelligenceSnapshot,
} from "@/lib/types";
import { computeCriteria } from "@/lib/bdr-engine";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useT } from "@/lib/i18n";
import { ModeToggle } from "../ModeToggle";
import { FieldHeader } from "../shared/FieldHeader";
import { RolePicker } from "../shared/RolePicker";
import { ScenarioExplanation } from "../shared/ScenarioExplanation";
import { MetricCard } from "@/components/shared/MetricCard";
import { SellerProspectionCard } from "./SellerProspectionCard";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";

const Globe3D = dynamic(() => import("../../Globe3D"), { ssr: false });

interface BulkDashboardProps {
  mode: ProspectionMode;
  onModeChange: (m: ProspectionMode) => void;
}

interface SellerFiltersPayload {
  sellers: Seller[];
  marketplaces: Marketplace[];
  categories: RefCategory[];
  countries: RefCountry[];
  priceCategories: RefOption[];
  customerCategories: RefOption[];
  matchingProfiles: MarketplaceProfileRecord[];
  matchingMessage?: string;
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border px-4 py-3 text-[13px] outline-none"
      style={{ borderColor: "#D6DEE8", color: "#03182F", background: "#FFFFFF" }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function BulkDashboard({ mode, onModeChange }: BulkDashboardProps) {
  const [data, setData] = useState<SellerFiltersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SellerIntelligenceSnapshot | null>(null);
  const [results, setResults] = useState<SellerIntelligenceSnapshot[]>([]);
  const [roles, setRoles] = useState<string[]>(["Head of Marketplace"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceCategory, setPriceCategory] = useState("");
  const [customerCategory, setCustomerCategory] = useState("");
  const [amazonPresence, setAmazonPresence] = useState("");
  const [operator, setOperator] = useState("");
  const [country, setCountry] = useState("");
  const [matchingMessage, setMatchingMessage] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const transferToOutreach = useWorkspaceStore((s) => s.transferToOutreach);
  const isInOutreach = useWorkspaceStore((s) => s.isInOutreach);
  const ingestAnalysis = useWorkspaceStore((s) => s.ingestAnalysis);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const t = useT();

  async function fetchSellers(query?: URLSearchParams) {
    const response = await fetch(`/api/sellers${query ? `?${query.toString()}` : ""}`);
    return (await response.json()) as SellerFiltersPayload;
  }

  useEffect(() => {
    fetchSellers()
      .then((payload) => {
        setData(payload);
        setMatchingMessage(payload.matchingMessage || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const average =
      results.length > 0
        ? Math.round(results.reduce((total, item) => total + item.totalScore, 0) / results.length)
        : 0;
    return {
      total: results.length,
      hot: results.filter((item) => item.priority === "HOT").length,
      high: results.filter((item) => item.priority === "HIGH").length,
      average,
    };
  }, [results]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setSelectedIds(new Set());
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (priceCategory) params.set("priceCategory", priceCategory);
    if (customerCategory) params.set("customerCategory", customerCategory);
    if (amazonPresence) params.set("amazonPresence", amazonPresence);
    if (operator) params.set("marketplace", operator);
    if (country) params.set("country", country);

    try {
      const payload = await fetchSellers(params);
      setData(payload);
      setMatchingMessage(payload.matchingMessage || null);
      const nextResults = (payload.sellers || [])
        .filter((seller) => !isInOutreach(seller.id))
        .map((seller) => computeCriteria(seller, payload.matchingProfiles || []))
        .sort((left, right) => right.totalScore - left.totalScore);

      setResults(nextResults);
      ingestAnalysis({
        kind: "bulk",
        generatedAt: new Date().toISOString(),
        sellerCount: nextResults.length,
        filters: {
          search,
          category,
          priceCategory,
          customerCategory,
          amazonPresence,
          operator,
          country,
          roles,
        },
        note: payload.matchingMessage,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  function pushToOutreach(result: SellerIntelligenceSnapshot) {
    transferToOutreach({
      seller: result.seller,
      totalScore: result.totalScore,
      priority: result.priority,
      reasoningText: result.reasoningText,
      scoreBreakdown: result.scoreBreakdown,
      signals: result.signals,
      strategy: result.strategy,
      recommendedContact: result.recommendedContact,
      operatorScores: result.operatorScores,
      topRecommendation: result.topRecommendation,
      contacts: [],
      source: "bulk",
    });
    setResults((current) => current.filter((item) => item.seller.id !== result.seller.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(result.seller.id);
      return next;
    });
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pushSelected() {
    const toPush = results.filter((r) => selectedIds.has(r.seller.id));
    for (const result of toPush) pushToOutreach(result);
    setActiveTab("outreach");
  }

  function pushAll() {
    for (const result of results) pushToOutreach(result);
    setActiveTab("outreach");
  }

  return (
    <div className="p-4 pt-[68px] lg:p-8 lg:pt-6 pb-16 lg:pb-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#E8F0FE", color: "#2764FF" }}>
              {t("bulk.badge")}
            </span>
          </div>
          <h1 className="font-bold" style={{ fontSize: 24, lineHeight: "34px", color: "#03182F" }}>
            {t("bulk.hero_title")}
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#425063" }}>
            {t("bulk.subtitle_long")}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="mirakl-card-elevated rounded-[30px] p-5">
          <div className="space-y-5">
            <div>
              <FieldHeader label={t("bulk.filters.search_seller_label")} hint={t("bulk.filters.search_seller_hint")} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("bulk.filters.search_placeholder_ex")}
                className="w-full rounded-2xl border px-4 py-3 text-[13px] outline-none"
                style={{ borderColor: "#D6DEE8", color: "#03182F", background: "#FFFFFF" }}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.category")} hint={t("bulk.filters.category_hint")} />
              <SelectField
                value={category}
                onChange={setCategory}
                options={(data?.categories || []).map((item) => ({ value: item.id, label: item.label }))}
                placeholder={t("bulk.filters.category_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.price_label")} hint={t("bulk.filters.price_hint")} />
              <SelectField
                value={priceCategory}
                onChange={setPriceCategory}
                options={(data?.priceCategories || []).map((item) => ({ value: item.id, label: item.label }))}
                placeholder={t("bulk.filters.price_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.customer_label")} hint={t("bulk.filters.customer_hint")} />
              <SelectField
                value={customerCategory}
                onChange={setCustomerCategory}
                options={(data?.customerCategories || []).map((item) => ({ value: item.id, label: item.label }))}
                placeholder={t("bulk.filters.customer_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.amazon_label")} hint={t("bulk.filters.amazon_hint")} />
              <SelectField
                value={amazonPresence}
                onChange={setAmazonPresence}
                options={[
                  { value: "yes", label: t("bulk.filters.amazon_detected") },
                  { value: "no", label: t("bulk.filters.amazon_none") },
                ]}
                placeholder={t("bulk.filters.amazon_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.operator_label")} hint={t("bulk.filters.operator_hint")} />
              <SelectField
                value={operator}
                onChange={setOperator}
                options={(data?.marketplaces || []).map((item) => ({
                  value: item.id,
                  label: item["marketplace name"],
                }))}
                placeholder={t("bulk.filters.operator_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.country_label")} hint={t("bulk.filters.country_hint")} />
              <SelectField
                value={country}
                onChange={setCountry}
                options={(data?.countries || []).map((item) => ({
                  value: item.id,
                  label: `${item.label} (${item.code})`,
                }))}
                placeholder={t("bulk.filters.country_all")}
              />
            </div>
            <div>
              <FieldHeader label={t("bulk.filters.roles_label")} hint={t("bulk.filters.roles_hint")} />
              <RolePicker value={roles} onChange={setRoles} />
            </div>
            <ScenarioExplanation mode="bulk" operatorCount={data?.matchingProfiles?.length || 0} />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || loading}
              className="w-full rounded-2xl px-4 py-3 text-[14px] font-bold"
              style={{ background: "#03182F", color: "#FFFFFF" }}
            >
              {analyzing ? t("bulk.filters.analyzing_bt") : t("bulk.filters.analyze")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {matchingMessage && (
            <div className="rounded-2xl border px-4 py-3 text-[13px]" style={{ borderColor: "#D6DEE8", color: "#425063", background: "#FFFFFF" }}>
              {matchingMessage}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="grid gap-4 sm:grid-cols-4">
              <MetricCard label={t("bulk.metrics.sellers")} value={stats.total} />
              <MetricCard label={t("bulk.metrics.avg_score")} value={stats.average} />
              <MetricCard label="HOT" value={stats.hot} accent="#B42318" />
              <MetricCard label="HIGH" value={stats.high} accent="#237A45" />
            </div>
            <label className="flex items-center gap-2 text-[12px] font-bold" style={{ color: "#425063" }}>
              <input type="checkbox" checked={showGlobe} onChange={() => setShowGlobe((current) => !current)} />
              {t("bulk.globe_label")}
            </label>
          </div>

          {showGlobe && (
            <div className="rounded-[30px] bg-white p-4 shadow-sm" style={{ border: "1px solid #E2E8F0" }}>
              <Globe3D
                theme="light"
                sellers={results.slice(0, 80).map((result) => ({
                  id: result.seller.id,
                  name: result.seller.seller_name,
                  country: result.seller.country?.code || "EU",
                  score: result.totalScore,
                  marketplace: result.topRecommendation?.marketplaceName || "",
                }))}
              />
            </div>
          )}

          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={pushAll}
                className="rounded-2xl px-4 py-2.5 text-[13px] font-bold"
                style={{ background: "#03182F", color: "#FFFFFF" }}
              >
                {t("bulk.push_all", { n: results.length })}
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={pushSelected}
                  className="rounded-2xl px-4 py-2.5 text-[13px] font-bold"
                  style={{ background: "#2764FF", color: "#FFFFFF" }}
                >
                  {t("bulk.push_selected_count", { n: selectedIds.size })}
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-2xl px-4 py-2.5 text-[13px]"
                  style={{ color: "#6B7280", border: "1px solid #E2E8F0" }}
                >
                  {t("bulk.unselect")}
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {loading && (
              <div className="rounded-3xl border bg-white p-6 text-[14px]" style={{ borderColor: "#E2E8F0", color: "#5A697A" }}>
                {t("bulk.loading_options")}
              </div>
            )}
            {!loading && results.length === 0 && !analyzing && (
              <div className="rounded-3xl border bg-white p-6 text-[14px]" style={{ borderColor: "#E2E8F0", color: "#5A697A" }}>
                {t("bulk.empty_cta")}
              </div>
            )}
            {results.map((result) => (
              <SellerProspectionCard
                key={result.seller.id}
                result={result}
                selected={selectedIds.has(result.seller.id)}
                onToggle={() => toggleSelection(result.seller.id)}
                onExplain={() => setDrawerResult(result)}
                onPush={() => pushToOutreach(result)}
              />
            ))}
          </div>
        </div>
      </div>

      <ExplainabilityDrawer result={drawerResult} onClose={() => setDrawerResult(null)} />
    </div>
  );
}
