"use client";

import type { SellerIntelligenceSnapshot } from "@/lib/types";
import { Badge } from "@/components/shared/Badge";
import { useT } from "@/lib/i18n";

interface ExplainabilityDrawerProps {
  result: SellerIntelligenceSnapshot | null;
  onClose: () => void;
}

export function ExplainabilityDrawer({ result, onClose }: ExplainabilityDrawerProps) {
  const t = useT();
  if (!result) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[520px] overflow-y-auto bg-white p-6 shadow-2xl"
        style={{ borderLeft: "1px solid #E2E8F0" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6E7D90" }}>
              {t("explain.header")}
            </p>
            <h2 className="mt-2 text-[22px] font-bold" style={{ color: "#03182F" }}>
              {result.seller.seller_name}
            </h2>
            <p className="mt-2 text-[13px]" style={{ color: "#526173" }}>
              {result.reasoningText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-[12px] font-bold"
            style={{ background: "#F3F6FA", color: "#425063" }}
          >
            {t("explain.close")}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {result.scoreBreakdown.map((criterion) => (
            <div key={criterion.key} className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "#03182F" }}>
                    {criterion.label}
                  </p>
                  <p className="text-[12px]" style={{ color: "#637486" }}>
                    {criterion.reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-bold" style={{ color: "#2764FF" }}>
                    {criterion.score}
                  </p>
                  <p className="text-[10px]" style={{ color: "#6E7D90" }}>
                    {t("explain.weight_label", { n: criterion.weight })}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "#E7EDF5" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${criterion.score}%`, background: "#2764FF" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6E7D90" }}>
            {t("explain.operator_scores")}
          </p>
          <div className="mt-3 space-y-3">
            {result.operatorScores.map((operator) => (
              <div key={operator.marketplaceId} className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>
                      {operator.marketplaceName}
                    </p>
                    <p className="text-[12px]" style={{ color: "#607082" }}>
                      {operator.region}
                    </p>
                  </div>
                  <Badge tone="blue">{Math.round(operator.totalScore)}/100</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6E7D90" }}>
            {t("explain.signals_detected")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.signals.map((signal) => (
              <Badge key={signal} tone="green">
                {signal}
              </Badge>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
