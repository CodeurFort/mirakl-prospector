"use client";

import type { Seller } from "@/lib/types";

interface BulkQualifyPanelProps {
  sellers: Seller[];
  onConfirm: () => void;
  onClose: () => void;
}

export function BulkQualifyPanel({ sellers, onConfirm, onClose }: BulkQualifyPanelProps) {
  const high = sellers.filter((s) => (s.match_score || 0) >= 70).length;
  const medium = sellers.filter((s) => (s.match_score || 0) >= 50 && (s.match_score || 0) < 70).length;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col animate-fade-in"
        style={{ background: "#03182F" }}
      >
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "#FFFFFF" }}>
              Push to Outreach
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {sellers.length} seller{sellers.length > 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(39,100,255,0.08)" }}>
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Total</p>
            <p className="text-[20px] font-bold" style={{ color: "#2764FF" }}>{sellers.length}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(39,100,255,0.08)" }}>
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>High</p>
            <p className="text-[20px] font-bold" style={{ color: "#2764FF" }}>{high}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(245,158,11,0.08)" }}>
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Medium</p>
            <p className="text-[20px] font-bold" style={{ color: "#F59E0B" }}>{medium}</p>
          </div>
        </div>

        {/* Seller list */}
        <div className="flex-1 overflow-y-auto px-6 py-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(39,100,255,0.2) transparent" }}>
          {sellers.map((seller) => {
            const score = seller.match_score || 0;
            const color = score >= 70 ? "#2764FF" : score >= 50 ? "#F59E0B" : "#F22E75";
            return (
              <div
                key={seller.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-md mb-1"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-[13px] font-bold" style={{ color }}>{score}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{seller.seller_name}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {seller.category?.label || "—"} · {seller.country?.code || "EU"}
                  </p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(242,46,117,0.08)", color: "rgba(242,46,117,0.7)" }}>
                  {seller.marketplace?.["marketplace name"] || "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-[13px] font-bold"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-lg text-[13px] font-bold transition-all hover:shadow-lg"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            Confirmer le push
          </button>
        </div>
      </div>
    </>
  );
}
