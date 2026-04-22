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
  const [marketplace, setMarketplace] = useState<MarketplaceResult | null>(null);
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
    "About You", "ASOS Marketplace", "Farfetch", "Veepee",
    "Privalia", "Decathlon Marketplace", "Showroomprivé", "Mango",
  ];

  return (
    <div className="p-4 pt-[68px] lg:pt-4 lg:p-8" style={{ maxWidth: 1200 }}>
      <div className="mb-8">
        <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F", paddingBottom: 8 }}>
          Marketplace Research
        </h1>
        <p style={{ fontSize: 14, color: "#30373E", lineHeight: "24px" }}>
          Entrez un nom de marketplace — l&apos;IA analyse son profil et identifie automatiquement les sellers compatibles
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
            className="flex-1 px-5 py-3.5 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 mirakl-card-elevated"
            style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            {loading ? "Analyse..." : "Analyser la marketplace"}
          </button>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-full transition-all hover:shadow-sm"
              style={{ border: "1px solid #E2E8F0", color: "#03182F", background: "#FFFFFF" }}
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 animate-fade-in">
          <div
            className="inline-block w-12 h-12 border-3 rounded-full animate-spin mb-4"
            style={{ borderColor: "#E2E8F0", borderTopColor: "#2764FF" }}
          />
          <p className="text-[16px] font-bold" style={{ color: "#03182F" }}>
            Analyse de &quot;{query}&quot; en cours...
          </p>
          <p className="text-[13px] mt-2" style={{ color: "#6B7280" }}>
            Identification du profil marketplace, cross-reference avec {sellers.length || 109} sellers, scoring...
          </p>
        </div>
      )}

      {/* Results */}
      {marketplace && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Marketplace profile card */}
          <div className="mirakl-card-dark p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                  PROFIL MARKETPLACE
                </p>
                <h2 className="text-[22px] font-bold mt-1 text-white">
                  {marketplace.name}
                </h2>
                <p className="text-[14px] mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {marketplace.description}
                </p>
              </div>
              <div
                className="px-4 py-2 rounded-lg text-[14px] font-bold"
                style={{ background: "rgba(39,100,255,0.2)", color: "#7EB3FF" }}
              >
                {marketplace.known_brands?.length || 0} marques identifiées
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <ProfileSection
                title="Catégories"
                items={marketplace.preferred_categories}
                color="#2764FF"
              />
              <ProfileSection
                title="Prix préférés"
                items={marketplace.preferred_prices}
                color="#2764FF"
              />
              <ProfileSection
                title="Prix acceptés"
                items={marketplace.accepted_prices}
                color="#6B7280"
              />
              <ProfileSection
                title="Pays cibles"
                items={marketplace.preferred_countries}
                color="#2764FF"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="mirakl-card-elevated p-5 text-center">
              <p className="text-[13px]" style={{ color: "#6B7280" }}>Sellers compatibles</p>
              <p className="text-[32px] font-bold mt-1" style={{ color: "#03182F" }}>{stats.total}</p>
            </div>
            <div className="mirakl-card-elevated p-5 text-center">
              <p className="text-[13px]" style={{ color: "#6B7280" }}>High priority</p>
              <p className="text-[32px] font-bold mt-1" style={{ color: "#2764FF" }}>{stats.high}</p>
            </div>
            <div className="mirakl-card-elevated p-5 text-center">
              <p className="text-[13px]" style={{ color: "#6B7280" }}>Medium priority</p>
              <p className="text-[32px] font-bold mt-1" style={{ color: "#E65100" }}>{stats.medium}</p>
            </div>
          </div>

          {/* Known brands */}
          {marketplace.known_brands && marketplace.known_brands.length > 0 && (
            <div className="mirakl-card-elevated p-6">
              <h3 className="font-bold mb-3" style={{ fontSize: 16, color: "#03182F" }}>
                Marques déjà présentes sur {marketplace.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {marketplace.known_brands.map((brand) => (
                  <span
                    key={brand}
                    className="px-3 py-1 rounded-full text-[12px] font-bold"
                    style={{ background: "#FFE7EC", color: "#770031" }}
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sellers table */}
          <div className="mirakl-card-elevated overflow-hidden">
            <div className="p-4" style={{ borderBottom: "2px solid #E2E8F0", background: "#F2F8FF" }}>
              <h3 className="font-bold" style={{ fontSize: 16, color: "#03182F" }}>
                Sellers recommandés pour {marketplace.name}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Seller</th>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Catégorie</th>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Pays</th>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Score</th>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Priorité</th>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#6B7280" }}>
                        Aucun seller compatible trouvé
                      </td>
                    </tr>
                  ) : (
                    sellers.map((seller, i) =>
                      seller && (
                        <tr
                          key={seller.id}
                          className="animate-fade-in hover:bg-[#F2F8FF] transition-colors"
                          style={{ borderBottom: "1px solid #E2E8F0", animationDelay: `${i * 20}ms` }}
                        >
                          <td className="px-4 py-3 font-bold" style={{ color: "#03182F" }}>{seller.name}</td>
                          <td className="px-4 py-3" style={{ color: "#30373E" }}>{seller.category}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: "#F2F8FF", color: "#2764FF" }}>
                              {seller.country}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-[6px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${seller.score}%`,
                                    background: seller.score >= 70 ? "#2764FF" : seller.score >= 50 ? "#F59E0B" : "#F22E75",
                                  }}
                                />
                              </div>
                              <span className="font-bold" style={{ color: "#03182F" }}>{seller.score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 text-[11px] font-bold rounded-full"
                              style={{
                                background: seller.priority === "HIGH" ? "#E8F5E9" : seller.priority === "MEDIUM" ? "#FFF3E0" : "#FFE7EC",
                                color: seller.priority === "HIGH" ? "#2E7D32" : seller.priority === "MEDIUM" ? "#E65100" : "#770031",
                              }}
                            >
                              {seller.priority}
                            </span>
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

function ProfileSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
        {title}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="px-2 py-0.5 rounded text-[11px] font-bold"
            style={{ background: `${color}33`, color: "#FFFFFF" }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
