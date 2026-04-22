"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Seller, Marketplace, RefCategory } from "@/lib/types";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false });

export default function GlobeDashboard() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/sellers")
      .then((r) => r.json())
      .then((data) => {
        setSellers(data.sellers || []);
        setMarketplaces(data.marketplaces || []);
        setCategories(data.categories || []);
        setLoading(false);
      });
  }, []);

  const countries = useMemo(() => {
    const map = new Map<string, string>();
    sellers.forEach((s) => {
      if (s.country?.code) map.set(s.country.code, s.country.label || s.country.code);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sellers]);

  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      if (search && !s.seller_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMarketplace && s.top_match_marketplace_id !== filterMarketplace) return false;
      if (filterCategory && s.category_id !== filterCategory) return false;
      if (filterCountry && (s.country?.code || "") !== filterCountry) return false;
      if (filterPriority) {
        const score = s.match_score || 0;
        if (filterPriority === "HIGH" && score < 70) return false;
        if (filterPriority === "MEDIUM" && (score < 50 || score >= 70)) return false;
        if (filterPriority === "LOW" && score >= 50) return false;
      }
      return true;
    }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [sellers, search, filterMarketplace, filterCategory, filterCountry, filterPriority]);

  const stats = useMemo(() => ({
    total: filteredSellers.length,
    high: filteredSellers.filter((s) => (s.match_score || 0) >= 70).length,
    medium: filteredSellers.filter((s) => (s.match_score || 0) >= 50 && (s.match_score || 0) < 70).length,
    low: filteredSellers.filter((s) => (s.match_score || 0) < 50).length,
    avgScore: filteredSellers.length > 0
      ? Math.round(filteredSellers.reduce((a, s) => a + (s.match_score || 0), 0) / filteredSellers.length)
      : 0,
  }), [filteredSellers]);

  const hasFilters = !!(search || filterMarketplace || filterCategory || filterCountry || filterPriority);

  function clearFilters() {
    setSearch(""); setFilterMarketplace(""); setFilterCategory("");
    setFilterCountry(""); setFilterPriority(""); setSelectedMarketplace(undefined);
  }

  function handleMarketplaceFilter(val: string) {
    setFilterMarketplace(val);
    const mp = val ? marketplaces.find((m) => m.id === val) : undefined;
    setSelectedMarketplace(mp?.["marketplace name"]);
  }

  function handleGlobeMarketplaceClick(name: string) {
    const mp = marketplaces.find((m) => m["marketplace name"].toLowerCase() === name.toLowerCase());
    if (!mp) return;
    if (filterMarketplace === mp.id) {
      setFilterMarketplace(""); setSelectedMarketplace(undefined);
    } else {
      setFilterMarketplace(mp.id); setSelectedMarketplace(name);
    }
  }

  function handleGlobeCountryClick(code: string) {
    setFilterCountry((prev) => (prev === code ? "" : code));
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden pt-[52px] lg:pt-0" style={{ background: "#03182F", minHeight: "100vh" }}>

      {/* ═══ GLOBE AREA ═══ */}
      <div className="relative flex flex-col min-w-0 h-[50vh] lg:h-auto lg:flex-1">


        {/* Globe */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.08)", borderTopColor: "#2764FF" }} />
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Chargement des données...</span>
            </div>
          ) : (
            <Globe3D
              sellers={filteredSellers.map((s) => ({
                id: s.id, name: s.seller_name,
                country: s.country?.code || "EU",
                score: s.match_score || 0,
                marketplace: s.marketplace?.["marketplace name"] || "",
              }))}
              selectedMarketplace={selectedMarketplace}
              onSellerClick={(id) => { window.location.href = `/seller/${id}`; }}
              onCountryClick={handleGlobeCountryClick}
              onMarketplaceClick={handleGlobeMarketplaceClick}
            />
          )}
        </div>

        {/* Bottom bar — hidden on mobile to save space */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none hidden lg:block">
          <div className="px-5 py-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
                MIRAKL CONNECT
              </p>
              <h1 className="text-[18px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>
                Seller Prospector
              </h1>
            </div>
            <div className="flex items-center gap-4 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#2764FF" }} /> Sellers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5" style={{ background: "#F22E75", transform: "rotate(45deg)" }} /> Marketplaces
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px" style={{ background: "#2764FF" }} /> Connexions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="w-full lg:w-[360px] shrink-0 flex flex-col flex-1 lg:flex-none"
        style={{ background: "linear-gradient(180deg, rgba(3,24,47,1) 0%, rgba(5,28,52,1) 100%)" }}>

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
              Explorer
            </h2>
            {hasFilters && (
              <button onClick={clearFilters}
                className="text-[10px] font-bold px-2.5 py-1 rounded-md transition-all hover:opacity-80"
                style={{ color: "#F22E75", background: "rgba(242,46,117,0.08)", border: "1px solid rgba(242,46,117,0.15)" }}>
                Effacer les filtres
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md text-[12px] focus:outline-none placeholder:text-white/20"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF" }}
            />
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="px-4 lg:px-5 py-3 grid grid-cols-2 lg:grid-cols-4 gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <KPIChip label="Sellers" value={stats.total} filtered={hasFilters} total={sellers.length} />
          <KPIChip label="Score moy." value={stats.avgScore} suffix="/100" accent />
          <KPIChip label="High" value={stats.high} dotColor="#2764FF" />
          <KPIChip label="Med / Low" value={stats.medium} secondValue={stats.low} dotColor="#F59E0B" secondDotColor="#F22E75" />
        </div>

        {/* ── Filters ── */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.2)" }}>FILTRES</p>

          <div className="grid grid-cols-2 gap-1.5">
            <PanelSelect value={filterMarketplace} onChange={handleMarketplaceFilter} placeholder="Marketplace"
              options={marketplaces.map((m) => ({ value: m.id, label: m["marketplace name"] }))} />
            <PanelSelect value={filterCategory} onChange={setFilterCategory} placeholder="Catégorie"
              options={categories.map((c) => ({ value: c.id, label: c.label }))} />
            <PanelSelect value={filterCountry} onChange={setFilterCountry} placeholder="Pays"
              options={countries.map(([code, label]) => ({ value: code, label: `${label} (${code})` }))} />
            <PanelSelect value={filterPriority} onChange={setFilterPriority} placeholder="Priorité"
              options={[{ value: "HIGH", label: "High (70+)" }, { value: "MEDIUM", label: "Medium (50-69)" }, { value: "LOW", label: "Low (<50)" }]} />
          </div>

          {/* Priority chips */}
          <div className="flex gap-1 mt-2">
            {([
              { key: "HIGH", label: "High", color: "#2764FF", count: stats.high },
              { key: "MEDIUM", label: "Med", color: "#F59E0B", count: stats.medium },
              { key: "LOW", label: "Low", color: "#F22E75", count: stats.low },
            ] as const).map((p) => {
              const active = filterPriority === p.key;
              return (
                <button key={p.key}
                  onClick={() => setFilterPriority(active ? "" : p.key)}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: active ? `${p.color}18` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${p.color}40` : "rgba(255,255,255,0.04)"}`,
                    color: active ? p.color : "rgba(255,255,255,0.25)",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color, opacity: active ? 1 : 0.4 }} />
                  {p.label}
                  <span className="text-[8px] opacity-60">{p.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Results header ── */}
        <div className="px-5 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
              {filteredSellers.length}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              seller{filteredSellers.length > 1 ? "s" : ""}
              {hasFilters && <span className="ml-1">sur {sellers.length}</span>}
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.15)" }}>
            PAR SCORE
          </span>
        </div>

        {/* ── Seller list ── */}
        <div className="flex-1 overflow-y-auto px-3 py-1.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(39,100,255,0.2) transparent" }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-md p-3 mb-1" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="h-3 w-28 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="h-2 w-16 rounded animate-pulse mt-2" style={{ background: "rgba(255,255,255,0.03)" }} />
              </div>
            ))
          ) : filteredSellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-[12px] font-bold text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                Aucun résultat
              </p>
              <p className="text-[10px] mt-1 text-center" style={{ color: "rgba(255,255,255,0.12)" }}>
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            filteredSellers.map((seller, i) => <SellerCard key={seller.id} seller={seller} index={i} />)
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/research"
            className="flex-1 py-2 rounded-md text-[11px] font-bold text-center transition-all hover:opacity-90"
            style={{ background: "rgba(39,100,255,0.08)", color: "#2764FF", border: "1px solid rgba(39,100,255,0.15)" }}>
            Marketplace Research
          </Link>
          <Link href="/campaigns"
            className="flex-1 py-2 rounded-md text-[11px] font-bold text-center transition-all hover:opacity-90"
            style={{ background: "#2764FF", color: "#FFFFFF" }}>
            Campagnes
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function SellerCard({ seller, index }: { seller: Seller; index: number }) {
  const score = seller.match_score || 0;
  const color = score >= 70 ? "#2764FF" : score >= 50 ? "#F59E0B" : "#F22E75";
  const tag = score >= 70 ? "HIGH" : score >= 50 ? "MED" : "LOW";

  return (
    <Link
      href={`/seller/${seller.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-all hover:bg-white/[0.03] group animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
    >
      {/* Score badge */}
      <div className="relative w-9 h-9 shrink-0">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${score * 0.975} 100`} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
          {score}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold truncate transition-colors group-hover:text-white"
          style={{ color: "rgba(255,255,255,0.8)" }}>
          {seller.seller_name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[8px] px-1 py-px rounded font-bold"
            style={{ background: `${color}15`, color }}>
            {tag}
          </span>
          <span className="text-[8px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
            {seller.category?.label || "—"}
          </span>
          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            {seller.country?.code || "EU"}
          </span>
        </div>
      </div>

      {/* Right info */}
      <div className="shrink-0 text-right">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(242,46,117,0.08)", color: "rgba(242,46,117,0.7)" }}>
          {seller.marketplace?.["marketplace name"] || "—"}
        </span>
      </div>

      {/* Arrow */}
      <svg className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-30 transition-opacity" viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function PanelSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 rounded-md text-[10px] focus:outline-none appearance-none cursor-pointer"
      style={{
        background: value ? "rgba(39,100,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${value ? "rgba(39,100,255,0.15)" : "rgba(255,255,255,0.05)"}`,
        color: value ? "#7EB3FF" : "rgba(255,255,255,0.3)",
      }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function KPIChip({ label, value, total, suffix, dotColor, secondValue, secondDotColor, accent, filtered }: {
  label: string; value: number; total?: number; suffix?: string;
  dotColor?: string; secondValue?: number; secondDotColor?: string;
  accent?: boolean; filtered?: boolean;
}) {
  return (
    <div className="rounded-md px-2.5 py-2"
      style={{
        background: accent ? "rgba(39,100,255,0.08)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${accent ? "rgba(39,100,255,0.15)" : "rgba(255,255,255,0.04)"}`,
      }}>
      <p className="text-[8px] font-bold mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
      {secondValue !== undefined ? (
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
            <span className="text-[13px] font-bold" style={{ color: dotColor }}>{value}</span>
          </span>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: secondDotColor }} />
            <span className="text-[13px] font-bold" style={{ color: secondDotColor }}>{secondValue}</span>
          </span>
        </div>
      ) : (
        <p className="text-[14px] font-bold leading-none" style={{ color: dotColor || (accent ? "#2764FF" : "#FFFFFF") }}>
          {dotColor && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: dotColor }} />}
          {value}
          {suffix && <span className="text-[9px] font-normal ml-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{suffix}</span>}
          {filtered && total !== undefined && total !== value && (
            <span className="text-[8px] font-normal ml-1" style={{ color: "rgba(255,255,255,0.1)" }}>/{total}</span>
          )}
        </p>
      )}
    </div>
  );
}
