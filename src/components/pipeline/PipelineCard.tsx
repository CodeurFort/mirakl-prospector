"use client";

import type { SellerRecord } from "@/lib/types";
import { PriorityBadge } from "@/components/shared/PriorityBadge";

interface PipelineCardProps {
  record: SellerRecord;
  stageColor: string;
  onAdvance: () => void;
  onRegress: () => void;
  onReturnToProspection: () => void;
  isLastStage: boolean;
}

export function PipelineCard({
  record,
  stageColor,
  onAdvance,
  onRegress,
  onReturnToProspection,
  isLastStage,
}: PipelineCardProps) {
  const seller = record.seller;
  const score = record.totalScore || seller.match_score || 0;
  const emailCount = record.emails.length;

  const nextLabels: Record<string, string> = {
    ready: "Enroller",
    in_sequence: "Marquer envoye",
    sent: "Marquer repondu",
  };

  return (
    <div className="mirakl-card animate-fade-in p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold" style={{ color: "#03182F" }}>
            {seller.seller_name}
          </p>
          <p className="mt-0.5 text-[10px]" style={{ color: "#6B7280" }}>
            {seller.category?.label || "—"} · {seller.country?.code || "EU"}
          </p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <span className="text-[12px] font-bold" style={{ color: "#2764FF" }}>{Math.round(score)}</span>
          <PriorityBadge score={score} />
        </div>
      </div>

      <div className="mb-2">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(242,46,117,0.08)", color: "rgba(242,46,117,0.7)" }}>
          {record.topRecommendation?.marketplaceName || seller.marketplace?.["marketplace name"] || "—"}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-1.5">
        {[1, 2, 3].map((mailNumber) => {
          const has = record.emails.some((email) => email.mailNumber === mailNumber);
          return (
            <span
              key={mailNumber}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: has ? stageColor : "#E2E8F0",
                color: has ? "#FFFFFF" : "#6B7280",
              }}
            >
              {has ? "✓" : mailNumber}
            </span>
          );
        })}
        <span className="ml-1 text-[9px]" style={{ color: "#6B7280" }}>{emailCount}/3 mails</span>
      </div>

      <div className="space-y-2">
        {!isLastStage && (
          <button
            onClick={onAdvance}
            className="w-full rounded-md py-1.5 text-[11px] font-bold transition-all hover:opacity-80"
            style={{ background: `${stageColor}12`, color: stageColor, border: `1px solid ${stageColor}30` }}
          >
            {nextLabels[record.pipelineStage] || "Avancer"} →
          </button>
        )}

        {record.pipelineStage !== "ready" && (
          <button
            onClick={onRegress}
            className="w-full rounded-md py-1.5 text-[11px] font-bold"
            style={{ background: "#F7FAFD", color: "#425063", border: "1px solid #D6DEE8" }}
          >
            ← Reculer
          </button>
        )}

        {record.pipelineStage === "ready" && (
          <button
            onClick={onReturnToProspection}
            className="w-full rounded-md py-1.5 text-[11px] font-bold"
            style={{ background: "#FFE9E9", color: "#B42318", border: "1px solid #F3C8C7" }}
          >
            Retour Prospection
          </button>
        )}

        {isLastStage && (
          <div className="w-full rounded-md py-1.5 text-center text-[11px] font-bold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
            Repondu ✓
          </div>
        )}
      </div>
    </div>
  );
}
