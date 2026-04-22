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
      for (const mailNumber of [1, 2, 3]) {
        try {
          await fetch("/api/emails/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sellerId, mailNumber }),
          });
          setGenerated((prev) => {
            const next = new Map(prev);
            const current = next.get(sellerId) || {
              mail1: false,
              mail2: false,
              mail3: false,
            };
            current[`mail${mailNumber}` as keyof typeof current] = true;
            next.set(sellerId, current);
            return next;
          });
        } catch {
          // Continue with next
        }
      }
    }
    setGenerating(false);
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Campagnes</h1>
        <p className="text-muted mt-1">
          Sélectionnez des sellers HIGH priority pour lancer une campagne de 3
          mails
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted">
          {selected.size} seller(s) sélectionné(s) sur {sellers.length} HIGH
          priority
        </p>
        <div className="flex gap-3">
          <button
            onClick={selectAll}
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            {selected.size === sellers.length
              ? "Désélectionner tout"
              : "Tout sélectionner"}
          </button>
          <button
            onClick={generateCampaign}
            disabled={selected.size === 0 || generating}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {generating
              ? "Génération en cours..."
              : `Lancer la campagne (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === sellers.length && sellers.length > 0}
                  onChange={selectAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Seller</th>
              <th className="text-left px-4 py-3 font-semibold">Catégorie</th>
              <th className="text-left px-4 py-3 font-semibold">Marketplace</th>
              <th className="text-left px-4 py-3 font-semibold">Score</th>
              <th className="text-left px-4 py-3 font-semibold">Statut mails</th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-shimmer" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              sellers.map((seller) => {
                const gen = generated.get(seller.id);
                return (
                  <tr
                    key={seller.id}
                    className="border-b border-border hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(seller.id)}
                        onChange={() => toggleSelect(seller.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {seller.seller_name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {seller.category?.label || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {seller.marketplace?.["marketplace name"] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-600">
                      {seller.match_score}
                    </td>
                    <td className="px-4 py-3">
                      {gen ? (
                        <div className="flex gap-1">
                          {[gen.mail1, gen.mail2, gen.mail3].map((done, i) => (
                            <span
                              key={i}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                done
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {i + 1}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Non généré</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/${seller.id}`}
                        className="text-primary text-xs hover:underline"
                      >
                        Voir mails
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
