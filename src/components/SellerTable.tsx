"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Seller, Marketplace, RefCategory } from "@/lib/types";

function PriorityBadge({ score }: { score: number }) {
  if (score >= 70)
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
        HIGH
      </span>
    );
  if (score >= 50)
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
        MEDIUM
      </span>
    );
  return (
    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
      LOW
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8">{score}</span>
    </div>
  );
}

export default function SellerTable() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

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
    medium: sellers.filter(
      (s) => (s.match_score || 0) >= 50 && (s.match_score || 0) < 70
    ).length,
    low: sellers.filter((s) => (s.match_score || 0) < 50).length,
  };

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total sellers" value={stats.total} color="text-foreground" />
        <StatCard label="High priority" value={stats.high} color="text-emerald-600" />
        <StatCard label="Medium priority" value={stats.medium} color="text-amber-600" />
        <StatCard label="Low priority" value={stats.low} color="text-red-500" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher un seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filterMarketplace}
          onChange={(e) => setFilterMarketplace(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Toutes les marketplaces</option>
          {marketplaces.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp["marketplace name"]}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Toutes les priorités</option>
          <option value="HIGH">HIGH (70+)</option>
          <option value="MEDIUM">MEDIUM (50-69)</option>
          <option value="LOW">LOW (&lt;50)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold">Seller</th>
                <th className="text-left px-4 py-3 font-semibold">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold">Pays</th>
                <th className="text-left px-4 py-3 font-semibold">Prix</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Best Match
                </th>
                <th className="text-left px-4 py-3 font-semibold">Score</th>
                <th className="text-left px-4 py-3 font-semibold">Priorité</th>
                <th className="text-left px-4 py-3 font-semibold">Amazon</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-shimmer" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sellers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted"
                  >
                    Aucun seller trouvé
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr
                    key={seller.id}
                    className="border-b border-border hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      {seller.seller_name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {seller.category?.label || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {seller.country?.code || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {seller.price_category?.label || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
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
                        <span className="text-emerald-600 text-xs font-medium">
                          Oui ({seller.amazon_product_count})
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Non</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/${seller.id}`}
                        className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Mails
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

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
