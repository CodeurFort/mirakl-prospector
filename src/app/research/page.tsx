"use client";

import { useState } from "react";
import Link from "next/link";

interface MarketplaceResult {
  name: string;
  description: string;
  preferred_categories: string[];
  preferred_prices: string[];
  accepted_prices: string[];
  preferred_countries: string[];
  accepted_countries: string[];
  min_catalog: number;
  known_brands: string[];
}

interface ScoredSeller {
  id: string;
  name: string;
  category: string;
  country: string;
  priceRange: string;
  catalogueSize: string;
  score: number;
  priority: string;
}

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [marketplace, setMarketplace] = useState<MarketplaceResult | null>(
    null
  );
  const [sellers, setSellers] = useState<ScoredSeller[]>([]);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0 });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setMarketplace(null);
    setSellers([]);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceName: query }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMarketplace(data.marketplace);
      setSellers(data.sellers || []);
      setStats({
        total: data.totalSellers || 0,
        high: data.highPriority || 0,
        medium: data.mediumPriority || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "About You",
    "ASOS Marketplace",
    "Farfetch",
    "Veepee",
    "Privalia",
    "Decathlon Marketplace",
    "Showroomprivé",
    "Mango",
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Marketplace Research</h1>
        <p className="text-muted mt-1">
          Entrez une marketplace pour identifier automatiquement les sellers
          compatibles
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom de la marketplace (ex: About You, ASOS, Farfetch...)"
            className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s);
              }}
              className="px-3 py-1 text-xs border border-border rounded-full hover:bg-gray-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted">
            Analyse de &quot;{query}&quot; avec GPT-4o...
          </p>
          <p className="text-xs text-muted mt-1">
            Identification du profil, cross-reference avec la base sellers,
            scoring...
          </p>
        </div>
      )}

      {/* Results */}
      {marketplace && !loading && (
        <div className="space-y-6">
          {/* Marketplace profile */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-2">{marketplace.name}</h2>
            <p className="text-sm text-muted mb-4">
              {marketplace.description}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-1">Catégories principales</p>
                <div className="flex flex-wrap gap-1">
                  {marketplace.preferred_categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Positionnement prix</p>
                <div className="flex flex-wrap gap-1">
                  {marketplace.preferred_prices.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs"
                    >
                      {p}
                    </span>
                  ))}
                  {marketplace.accepted_prices.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Pays cibles</p>
                <div className="flex flex-wrap gap-1">
                  {marketplace.preferred_countries.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">
                  Marques connues ({marketplace.known_brands?.length || 0})
                </p>
                <p className="text-xs text-muted">
                  {marketplace.known_brands?.slice(0, 10).join(", ")}
                  {(marketplace.known_brands?.length || 0) > 10 && "..."}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-muted">Sellers compatibles</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-muted">High priority</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.high}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-muted">Medium priority</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.medium}
              </p>
            </div>
          </div>

          {/* Sellers table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-semibold">
                      Seller
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Catégorie
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Pays</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Priorité
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted"
                      >
                        Aucun seller compatible trouvé
                      </td>
                    </tr>
                  ) : (
                    sellers.map(
                      (seller) =>
                        seller && (
                          <tr
                            key={seller.id}
                            className="border-b border-border hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-3 font-medium">
                              {seller.name}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {seller.category}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {seller.country}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      seller.score >= 70
                                        ? "bg-emerald-500"
                                        : seller.score >= 50
                                          ? "bg-amber-500"
                                          : "bg-red-400"
                                    }`}
                                    style={{ width: `${seller.score}%` }}
                                  />
                                </div>
                                <span className="font-medium w-8">
                                  {seller.score}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  seller.priority === "HIGH"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : seller.priority === "MEDIUM"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {seller.priority}
                              </span>
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
                        )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
