"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Badge } from "@/components/shared/Badge";

interface SellerAccountsProps {
  onSelect: (recordId: string) => void;
}

export function SellerAccounts({ onSelect }: SellerAccountsProps) {
  const sellerRecords = useWorkspaceStore((s) => s.sellers);
  const returnToProspection = useWorkspaceStore((s) => s.returnToProspection);

  const stageStyle: Record<string, { bg: string; color: string; label: string }> = {
    ready: { bg: "#F2F8FF", color: "#2764FF", label: "Ready" },
    in_sequence: { bg: "#FFF3E0", color: "#E65100", label: "In Sequence" },
    sent: { bg: "#E8F5E9", color: "#2E7D32", label: "Sent" },
    replied: { bg: "#F3E8FF", color: "#7C3AED", label: "Replied" },
  };

  return (
    <div className="mirakl-card-elevated overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: "#F2F8FF", borderBottom: "2px solid #E2E8F0" }}>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Seller</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Categorie</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Score</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Strategie</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Emails</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Stage</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#03182F" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sellerRecords.map((record, index) => {
            const score = record.totalScore || record.seller.match_score || 0;
            const stage = stageStyle[record.pipelineStage] || stageStyle.ready;

            return (
              <tr
                key={record.id}
                className="animate-fade-in cursor-pointer transition-colors hover:bg-[#F2F8FF]"
                style={{ borderBottom: "1px solid #E2E8F0", animationDelay: `${index * 15}ms` }}
                onClick={() => onSelect(record.id)}
              >
                <td className="px-4 py-3">
                  <p className="font-bold" style={{ color: "#03182F" }}>{record.seller.seller_name}</p>
                  <p className="text-[11px]" style={{ color: "#6B7280" }}>
                    {record.seller.country?.code || "EU"} · {record.topRecommendation?.marketplaceName || record.seller.marketplace?.["marketplace name"] || "—"}
                  </p>
                </td>
                <td className="px-4 py-3" style={{ color: "#30373E" }}>
                  {record.seller.category?.label || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: "#2764FF" }}>{Math.round(score)}</span>
                    <PriorityBadge score={score} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="blue">{record.strategy.method}</Badge>
                    <Badge tone="pink">{record.strategy.angle}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((mailNumber) => {
                      const has = record.emails.some((email) => email.mailNumber === mailNumber);
                      return (
                        <span
                          key={mailNumber}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{
                            background: has ? "#2764FF" : "#E2E8F0",
                            color: has ? "#FFFFFF" : "#6B7280",
                          }}
                        >
                          {has ? "✓" : mailNumber}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: stage.bg, color: stage.color }}
                  >
                    {stage.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(record.id);
                      }}
                      className="text-[12px] font-bold hover:underline"
                      style={{ color: "#2764FF" }}
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        returnToProspection(record.id);
                      }}
                      className="text-[12px] font-bold hover:underline"
                      style={{ color: "#B42318" }}
                    >
                      Retour Prospection
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
