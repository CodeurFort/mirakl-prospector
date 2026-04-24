"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { PipelineStage } from "@/lib/types";
import { PipelineCard } from "./PipelineCard";

const COLUMNS: { stage: PipelineStage; label: string; color: string; bg: string }[] = [
  { stage: "ready", label: "Ready", color: "#2764FF", bg: "rgba(39,100,255,0.06)" },
  { stage: "in_sequence", label: "In Sequence", color: "#E65100", bg: "rgba(230,81,0,0.06)" },
  { stage: "sent", label: "Sent", color: "#2E7D32", bg: "rgba(46,125,50,0.06)" },
  { stage: "replied", label: "Replied", color: "#7C3AED", bg: "rgba(124,58,237,0.06)" },
];

export function PipelineTab() {
  const sellerRecords = useWorkspaceStore((s) => s.sellers);
  const advanceStage = useWorkspaceStore((s) => s.advanceStage);
  const regressStage = useWorkspaceStore((s) => s.regressStage);
  const returnToProspection = useWorkspaceStore((s) => s.returnToProspection);

  const byStage = (stage: PipelineStage) => sellerRecords.filter((record) => record.pipelineStage === stage);

  return (
    <div className="h-full p-4 pt-[68px] lg:p-8 lg:pt-4 pb-16 lg:pb-8" style={{ maxWidth: 1400 }}>
      <div className="mb-6">
        <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F" }}>
          Pipeline
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "#30373E" }}>
          Suivez la progression de vos sequences d'outreach
        </p>
      </div>

      {sellerRecords.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#F2F8FF", border: "1px solid #E2E8F0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          </div>
          <p className="text-[16px] font-bold" style={{ color: "#03182F" }}>Pipeline vide</p>
          <p className="mt-2 text-[13px]" style={{ color: "#6B7280" }}>
            Les sellers pousses depuis Prospection apparaitront ici
          </p>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUMNS.map((column) => {
            const records = byStage(column.stage);
            return (
              <div key={column.stage} className="flex flex-col overflow-hidden rounded-lg" style={{ background: column.bg }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${column.color}20` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: column.color }} />
                    <span className="text-[13px] font-bold" style={{ color: column.color }}>{column.label}</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: `${column.color}15`, color: column.color }}
                  >
                    {records.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ scrollbarWidth: "thin" }}>
                  {records.map((record) => (
                    <PipelineCard
                      key={record.id}
                      record={record}
                      stageColor={column.color}
                      onAdvance={() => advanceStage(record.id)}
                      onRegress={() => regressStage(record.id)}
                      onReturnToProspection={() => returnToProspection(record.id)}
                      isLastStage={column.stage === "replied"}
                    />
                  ))}
                  {records.length === 0 && (
                    <p className="py-8 text-center text-[11px]" style={{ color: "#6B7280" }}>Aucun seller</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
