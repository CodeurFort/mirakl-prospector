"use client";

import type { SellerIntelligenceSnapshot } from "@/lib/types";
import { Badge } from "@/components/shared/Badge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { useT } from "@/lib/i18n";

interface SellerProspectionCardProps {
  result: SellerIntelligenceSnapshot;
  selected: boolean;
  onToggle: () => void;
  onExplain: () => void;
  onPush: () => void;
}

export function SellerProspectionCard({
  result,
  selected,
  onToggle,
  onExplain,
  onPush,
}: SellerProspectionCardProps) {
  const t = useT();
  const top = result.topRecommendation;

  return (
    <div
      className="mirakl-card-elevated rounded-3xl p-5"
      style={selected ? { outline: "2px solid #2764FF" } : undefined}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="h-4 w-4 shrink-0 cursor-pointer rounded"
              style={{ accentColor: "#2764FF" }}
            />
            <h3 className="text-[20px] font-bold" style={{ color: "#03182F" }}>
              {result.seller.seller_name}
            </h3>
            <Badge tone="slate">{top?.marketplaceName || t("card.operator_tbd")}</Badge>
            <PriorityBadge score={result.totalScore} />
          </div>
          <p className="mt-2 text-[13px] leading-6" style={{ color: "#4D5B6D" }}>
            {result.reasoningText}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[34px] font-bold leading-none" style={{ color: "#2764FF" }}>
            {Math.round(result.totalScore)}
          </p>
          <p className="text-[11px]" style={{ color: "#6D7C8C" }}>
            {t("card.score_seller")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
            {t("card.score_breakdown")}
          </p>
          <div className="mt-3 space-y-3">
            {result.scoreBreakdown.map((criterion) => (
              <div key={criterion.key}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold" style={{ color: "#03182F" }}>
                    {criterion.label}
                  </span>
                  <span className="text-[12px]" style={{ color: "#6E7D90" }}>
                    {criterion.score} · {criterion.weight}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "#E7EDF5" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${criterion.score}%`, background: "#2764FF" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
              {t("card.signals")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.signals.map((signal) => (
                <Badge key={signal} tone="green">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
              {t("card.strategy_recommended")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="blue">{result.strategy.method}</Badge>
              <Badge tone="pink">{result.strategy.angle}</Badge>
              <Badge tone="amber">{result.strategy.seasonalMoment}</Badge>
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0", background: "#F9FBFD" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
              {t("card.contact_recommended")}
            </p>
            <p className="mt-2 text-[14px] font-bold" style={{ color: "#03182F" }}>
              {result.recommendedContact.role}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "#5C6B7C" }}>
              {result.recommendedContact.linkedinHint}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onExplain}
          className="rounded-2xl px-4 py-3 text-[13px] font-bold"
          style={{ background: "#F2F8FF", color: "#2251CC" }}
        >
          {t("card.see_explainability")}
        </button>
        <button
          onClick={onPush}
          className="rounded-2xl px-4 py-3 text-[13px] font-bold"
          style={{ background: "#03182F", color: "#FFFFFF" }}
        >
          {t("card.push_outreach_btn")}
        </button>
      </div>
    </div>
  );
}
