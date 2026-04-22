"use client";

import { useState, useEffect } from "react";
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
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [currentSeller, setCurrentSeller] = useState("");
  const [currentMail, setCurrentMail] = useState(0);
  const [generated, setGenerated] = useState<
    Map<string, { mail1: boolean; mail2: boolean; mail3: boolean }>
  >(new Map());

  useEffect(() => {
    fetch("/api/sellers?priority=HIGH")
      .then((r) => r.json())
      .then((data) => {
        setSellers(data.sellers || []);
        setLoading(false);
      });
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === sellers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sellers.map((s) => s.id)));
    }
  }

  async function generateCampaign() {
    setGenerating(true);
    for (const sellerId of selected) {
      const seller = sellers.find((s) => s.id === sellerId);
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
        } catch {
          // Continue
        }
      }
    }
    setCurrentSeller("");
    setCurrentMail(0);
    setGenerating(false);
  }

  const completedCount = Array.from(generated.values()).filter(
    (g) => g.mail1 && g.mail2 && g.mail3
  ).length;

  return (
    <div className="p-8" style={{ maxWidth: 1200 }}>
      <div className="mb-8">
        <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F", paddingBottom: 8 }}>
          Campagnes de prospection
        </h1>
        <p style={{ fontSize: 14, color: "#30373E", lineHeight: "24px" }}>
          Sélectionnez des sellers HIGH priority pour générer une séquence complète de 3 mails
        </p>
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
            <div
              className="w-8 h-8 border-3 rounded-full animate-spin"
              style={{ borderColor: "#E2E8F0", borderTopColor: "#2764FF" }}
            />
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(completedCount / selected.size) * 100}%`,
                background: "#2764FF",
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[14px]" style={{ color: "#6B7280" }}>
          <span className="font-bold" style={{ color: "#2764FF" }}>{selected.size}</span> seller(s) sélectionné(s) sur{" "}
          <span className="font-bold" style={{ color: "#03182F" }}>{sellers.length}</span> HIGH priority
          {completedCount > 0 && (
            <span style={{ color: "#2E7D32" }}>
              {" "}— {completedCount} campagne(s) générée(s)
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={selectAll}
            className="px-4 py-2.5 rounded-lg text-[13px] font-bold transition-colors"
            style={{ border: "1px solid #E2E8F0", color: "#03182F", background: "#FFFFFF" }}
          >
            {selected.size === sellers.length ? "Désélectionner tout" : "Tout sélectionner"}
          </button>
          <button
            onClick={generateCampaign}
            disabled={selected.size === 0 || generating}
            className="px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            {generating ? "Génération..." : `Lancer la campagne (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mirakl-card-elevated overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr style={{ background: "#F2F8FF", borderBottom: "2px solid #E2E8F0" }}>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === sellers.length && sellers.length > 0}
                  onChange={selectAll}
                  className="rounded"
                />
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
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-shimmer" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              sellers.map((seller, i) => {
                const gen = generated.get(seller.id);
                return (
                  <tr
                    key={seller.id}
                    className="animate-fade-in hover:bg-[#F2F8FF] transition-colors"
                    style={{ borderBottom: "1px solid #E2E8F0", animationDelay: `${i * 15}ms` }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(seller.id)}
                        onChange={() => toggleSelect(seller.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#03182F" }}>
                      {seller.seller_name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#30373E" }}>
                      {seller.category?.label || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-lg text-[12px] font-bold"
                        style={{ background: "#2764FF", color: "#FFFFFF" }}
                      >
                        {seller.marketplace?.["marketplace name"] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#2764FF" }}>
                      {seller.match_score}
                    </td>
                    <td className="px-4 py-3">
                      {gen ? (
                        <div className="flex gap-1.5">
                          {[
                            { done: gen.mail1, label: "1" },
                            { done: gen.mail2, label: "2" },
                            { done: gen.mail3, label: "3" },
                          ].map((m) => (
                            <span
                              key={m.label}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                              style={{
                                background: m.done ? "#2764FF" : "#E2E8F0",
                                color: m.done ? "#FFFFFF" : "#6B7280",
                              }}
                            >
                              {m.done ? "✓" : m.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px]" style={{ color: "#6B7280" }}>
                          Non généré
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/${seller.id}`}
                        className="text-[12px] font-bold hover:underline"
                        style={{ color: "#2764FF" }}
                      >
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
