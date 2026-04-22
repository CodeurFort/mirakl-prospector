"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Seller, Marketplace, RefCategory } from "@/lib/types";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false });

function PriorityBadge({ score }: { score: number }) {
  if (score >= 70)
    return (
      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
        HIGH
      </span>
    );
  if (score >= 50)
    return (
      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full" style={{ background: "#FFF3E0", color: "#E65100" }}>
        MEDIUM
      </span>
    );
  return (
    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full" style={{ background: "#FFE7EC", color: "#770031" }}>
      LOW
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#2764FF" : score >= 50 ? "#F59E0B" : "#F22E75";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-[6px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[13px] font-bold" style={{ color: "#03182F", width: 28 }}>
        {score}
      </span>
    </div>
  );
}

export default function SellerTable() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showGlobe, setShowGlobe] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [filterMarketplace, filterCategory, filterPriority, search]);

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMarketplace) params.set("marketplace", filterMarketplace);
    if (filterCategory) params.set("category", filterCategory);
    if (filterPriority) params.set("priority", filterPriority);
    if (search) params.set("search", search);

    const res = await fetch(`/api/sellers?${params}`);
    const data = await res.json();
    setSellers(data.sellers || []);
    setMarketplaces(data.marketplaces || []);
    setCategories(data.categories || []);
    setLoading(false);
  }

  const stats = {
    total: sellers.length,
    high: sellers.filter((s) => (s.match_score || 0) >= 70).length,
    medium: sellers.filter((s) => (s.match_score || 0) >= 50 && (s.match_score || 0) < 70).length,
    low: sellers.filter((s) => (s.match_score || 0) < 50).length,
    avgScore: sellers.length > 0 ? Math.round(sellers.reduce((a, s) => a + (s.match_score || 0), 0) / sellers.length) : 0,
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Total sellers" value={stats.total} accent={false} />
        <KPICard label="Score moyen" value={stats.avgScore} suffix="/100" accent />
        <KPICard label="High priority" value={stats.high} color="#2E7D32" accent={false} />
        <KPICard label="Medium" value={stats.medium} color="#E65100" accent={false} />
        <KPICard label="Low" value={stats.low} color="#770031" accent={false} />
      </div>

      {/* 3D Globe */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowGlobe(!showGlobe)}
          className="text-[13px] font-bold transition-colors"
          style={{ color: "#2764FF" }}
        >
          {showGlobe ? "Masquer le globe" : "Afficher le globe"}
        </button>
      </div>
      {showGlobe && !loading && sellers.length > 0 && (
        <div className="animate-fade-in mirakl-card-dark overflow-hidden">
          <Globe3D
            sellers={sellers.map((s) => ({
              id: s.id,
              name: s.seller_name,
              country: s.country?.code || "EU",
              score: s.match_score || 0,
              marketplace: s.marketplace?.["marketplace name"] || "",
            }))}
            onSellerClick={(id) => router.push(`/seller/${id}`)}
            onMarketplaceClick={(name) => {
              const mp = marketplaces.find(
                (m) => m["marketplace name"].toLowerCase() === name.toLowerCase()
              );
              if (mp) setFilterMarketplace(mp.id);
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher un seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-[14px] w-64 focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 mirakl-card"
          style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
        />
        <select
          value={filterMarketplace}
          onChange={(e) => setFilterMarketplace(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 mirakl-card"
          style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
        >
          <option value="">Toutes les marketplaces</option>
          {marketplaces.map((mp) => (
            <option key={mp.id} value={mp.id}>{mp["marketplace name"]}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 mirakl-card"
          style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 mirakl-card"
          style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
        >
          <option value="">Toutes les priorités</option>
          <option value="HIGH">HIGH (70+)</option>
          <option value="MEDIUM">MEDIUM (50-69)</option>
          <option value="LOW">LOW (&lt;50)</option>
        </select>
      </div>

      {/* Table */}
      <div className="mirakl-card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "#F2F8FF", borderBottom: "2px solid #E2E8F0" }}>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Seller</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Catégorie</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Pays</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Prix</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Best Match</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Score</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Priorité</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Amazon</th>
                <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F", fontSize: 14 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-shimmer" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center" style={{ color: "#6B7280" }}>
                    Aucun seller trouvé
                  </td>
                </tr>
              ) : (
                sellers.map((seller, i) => (
                  <tr
                    key={seller.id}
                    className="animate-fade-in transition-colors hover:bg-[#F2F8FF]"
                    style={{
                      borderBottom: "1px solid #E2E8F0",
                      animationDelay: `${i * 20}ms`,
                    }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: "#03182F" }}>
                      {seller.seller_name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#30373E" }}>
                      {seller.category?.label || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: "#F2F8FF", color: "#2764FF" }}>
                        {seller.country?.code || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "#30373E" }}>
                      {seller.price_category?.label || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-[12px] font-bold" style={{ background: "#2764FF", color: "#FFFFFF" }}>
                        {seller.marketplace?.["marketplace name"] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={seller.match_score || 0} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge score={seller.match_score || 0} />
                    </td>
                    <td className="px-4 py-3">
                      {seller.amazon_presence ? (
                        <span className="text-[12px] font-bold" style={{ color: "#2E7D32" }}>
                          Oui ({seller.amazon_product_count})
                        </span>
                      ) : (
                        <span className="text-[12px]" style={{ color: "#6B7280" }}>Non</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/${seller.id}`}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:shadow-md"
                        style={{ background: "#2764FF", color: "#FFFFFF" }}
                      >
                        Générer mails
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  suffix,
  color,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  accent: boolean;
}) {
  return (
    <div className={accent ? "mirakl-card-dark p-6" : "mirakl-card-elevated p-6"}>
      <p
        className="text-[14px] font-normal mb-2"
        style={{ color: accent ? "rgba(255,255,255,0.6)" : "#6B7280" }}
      >
        {label}
      </p>
      <p
        className="text-[28px] font-bold leading-tight"
        style={{ color: accent ? "#FFFFFF" : color || "#03182F" }}
      >
        {value}
        {suffix && (
          <span
            className="text-[16px] font-normal ml-1"
            style={{ color: accent ? "rgba(255,255,255,0.5)" : "#6B7280" }}
          >
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
