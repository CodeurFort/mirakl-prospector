"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface Seller {
  id: string;
  seller_name: string;
  match_score: number;
  category?: { label: string };
  marketplace?: { "marketplace name": string };
  country?: { code: string };
}

export default function CampaignsPage() {
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [currentSeller, setCurrentSeller] = useState("");
  const [currentMail, setCurrentMail] = useState(0);
  const [generated, setGenerated] = useState<
    Map<string, { mail1: boolean; mail2: boolean; mail3: boolean }>
  >(new Map());

  useEffect(() => {
    fetch("/api/sellers")
      .then((r) => r.json())
      .then((data) => {
        setAllSellers(data.sellers || []);
        setLoading(false);
      });
  }, []);

  const highSellers = useMemo(() => allSellers.filter((s) => (s.match_score || 0) >= 70), [allSellers]);
  const medSellers = useMemo(() => allSellers.filter((s) => (s.match_score || 0) >= 50 && (s.match_score || 0) < 70), [allSellers]);

  // Marketplace breakdown for selected sellers
  const mpBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    highSellers.forEach((s) => {
      const name = s.marketplace?.["marketplace name"] || "Autre";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [highSellers]);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    highSellers.forEach((s) => {
      const name = s.category?.label || "Autre";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [highSellers]);

  const maxMp = mpBreakdown.length > 0 ? mpBreakdown[0][1] : 1;
  const maxCat = catBreakdown.length > 0 ? catBreakdown[0][1] : 1;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === highSellers.length) setSelected(new Set());
    else setSelected(new Set(highSellers.map((s) => s.id)));
  }

  async function generateCampaign() {
    setGenerating(true);
    for (const sellerId of selected) {
      const seller = highSellers.find((s) => s.id === sellerId);
      setCurrentSeller(seller?.seller_name || "");
      for (const mailNumber of [1, 2, 3]) {
        setCurrentMail(mailNumber);
        try {
          await fetch("/api/emails/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sellerId, mailNumber }),
          });
          setGenerated((prev) => {
            const next = new Map(prev);
            const current = next.get(sellerId) || { mail1: false, mail2: false, mail3: false };
            current[`mail${mailNumber}` as keyof typeof current] = true;
            next.set(sellerId, current);
            return next;
          });
        } catch { /* continue */ }
      }
    }
    setCurrentSeller("");
    setCurrentMail(0);
    setGenerating(false);
  }

  const completedCount = Array.from(generated.values()).filter((g) => g.mail1 && g.mail2 && g.mail3).length;
  const totalMailsGenerated = Array.from(generated.values()).reduce(
    (acc, g) => acc + (g.mail1 ? 1 : 0) + (g.mail2 ? 1 : 0) + (g.mail3 ? 1 : 0), 0
  );

  return (
    <div className="p-4 pt-[68px] lg:pt-4 lg:p-8" style={{ maxWidth: 1200 }}>
      <div className="mb-6">
        <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F" }}>
          Campagnes de prospection
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "#30373E" }}>
          Vue d'ensemble et génération batch des séquences de 3 mails
        </p>
      </div>

      {/* ══ Analytics Dashboard ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold" style={{ color: "#6B7280" }}>Total sellers</p>
          <p className="text-[28px] font-bold mt-1" style={{ color: "#03182F" }}>
            {allSellers.length}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
              {highSellers.length} HIGH
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "#FFF3E0", color: "#E65100" }}>
              {medSellers.length} MED
            </span>
          </div>
        </div>

        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold" style={{ color: "#6B7280" }}>Sellers ciblés</p>
          <p className="text-[28px] font-bold mt-1" style={{ color: "#2764FF" }}>
            {selected.size}
          </p>
          <p className="text-[11px] mt-2" style={{ color: "#6B7280" }}>
            {selected.size * 3} mails à générer
          </p>
        </div>

        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold" style={{ color: "#6B7280" }}>Mails générés</p>
          <p className="text-[28px] font-bold mt-1" style={{ color: "#2E7D32" }}>
            {totalMailsGenerated}
          </p>
          <p className="text-[11px] mt-2" style={{ color: "#6B7280" }}>
            {completedCount} séquence{completedCount > 1 ? "s" : ""} complète{completedCount > 1 ? "s" : ""}
          </p>
        </div>

        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold" style={{ color: "#6B7280" }}>Couverture HIGH</p>
          <p className="text-[28px] font-bold mt-1" style={{ color: completedCount > 0 ? "#2764FF" : "#6B7280" }}>
            {highSellers.length > 0 ? Math.round((completedCount / highSellers.length) * 100) : 0}%
          </p>
          <div className="mt-2 h-[4px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${highSellers.length > 0 ? (completedCount / highSellers.length) * 100 : 0}%`, background: "#2764FF" }} />
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Marketplace breakdown */}
        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold mb-3" style={{ color: "#03182F" }}>
            Répartition par marketplace
          </p>
          <div className="space-y-2">
            {mpBreakdown.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[11px] font-bold w-28 truncate" style={{ color: "#30373E" }}>{name}</span>
                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / maxMp) * 100}%`, background: "#2764FF" }} />
                </div>
                <span className="text-[11px] font-bold w-6 text-right" style={{ color: "#2764FF" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="mirakl-card-elevated p-5">
          <p className="text-[12px] font-bold mb-3" style={{ color: "#03182F" }}>
            Répartition par catégorie
          </p>
          <div className="space-y-2">
            {catBreakdown.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[11px] font-bold w-28 truncate" style={{ color: "#30373E" }}>{name}</span>
                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / maxCat) * 100}%`, background: "#F22E75" }} />
                </div>
                <span className="text-[11px] font-bold w-6 text-right" style={{ color: "#F22E75" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar during generation */}
      {generating && (
        <div className="mirakl-card-elevated p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>
                Génération en cours — {currentSeller}
              </p>
              <p className="text-[12px]" style={{ color: "#6B7280" }}>
                Mail {currentMail}/3 | {completedCount}/{selected.size} sellers complétés
              </p>
            </div>
            <div className="w-8 h-8 border-3 rounded-full animate-spin"
              style={{ borderColor: "#E2E8F0", borderTopColor: "#2764FF" }} />
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / selected.size) * 100}%`, background: "#2764FF" }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <p className="text-[14px]" style={{ color: "#6B7280" }}>
          <span className="font-bold" style={{ color: "#2764FF" }}>{selected.size}</span> seller(s) sélectionné(s) sur{" "}
          <span className="font-bold" style={{ color: "#03182F" }}>{highSellers.length}</span> HIGH priority
        </p>
        <div className="flex gap-3">
          <button onClick={selectAll}
            className="px-4 py-2.5 rounded-lg text-[13px] font-bold transition-colors"
            style={{ border: "1px solid #E2E8F0", color: "#03182F", background: "#FFFFFF" }}>
            {selected.size === highSellers.length ? "Désélectionner tout" : "Tout sélectionner"}
          </button>
          <button onClick={generateCampaign}
            disabled={selected.size === 0 || generating}
            className="px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: "#2764FF", color: "#FFFFFF" }}>
            {generating ? "Génération..." : `Lancer la campagne (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mirakl-card-elevated overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px] lg:text-[14px] min-w-[600px]">
          <thead>
            <tr style={{ background: "#F2F8FF", borderBottom: "2px solid #E2E8F0" }}>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selected.size === highSellers.length && highSellers.length > 0}
                  onChange={selectAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Seller</th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Catégorie</th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Marketplace</th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Score</th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Mails</th>
              <th className="text-left px-4 py-3 font-bold" style={{ color: "#03182F" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-shimmer" /></td>
                  ))}
                </tr>
              ))
            ) : (
              highSellers.map((seller, i) => {
                const gen = generated.get(seller.id);
                return (
                  <tr key={seller.id}
                    className="animate-fade-in hover:bg-[#F2F8FF] transition-colors"
                    style={{ borderBottom: "1px solid #E2E8F0", animationDelay: `${i * 15}ms` }}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(seller.id)}
                        onChange={() => toggleSelect(seller.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#03182F" }}>{seller.seller_name}</td>
                    <td className="px-4 py-3" style={{ color: "#30373E" }}>{seller.category?.label || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-[12px] font-bold"
                        style={{ background: "#2764FF", color: "#FFFFFF" }}>
                        {seller.marketplace?.["marketplace name"] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#2764FF" }}>{seller.match_score}</td>
                    <td className="px-4 py-3">
                      {gen ? (
                        <div className="flex gap-1.5">
                          {([["mail1", "1"], ["mail2", "2"], ["mail3", "3"]] as const).map(([key, label]) => (
                            <span key={label}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                              style={{
                                background: gen[key] ? "#2764FF" : "#E2E8F0",
                                color: gen[key] ? "#FFFFFF" : "#6B7280",
                              }}>
                              {gen[key] ? "✓" : label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px]" style={{ color: "#6B7280" }}>Non généré</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/seller/${seller.id}`}
                        className="text-[12px] font-bold hover:underline" style={{ color: "#2764FF" }}>
                        Voir les mails
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
