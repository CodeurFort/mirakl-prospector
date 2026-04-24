import type { MarketplaceRecommendation } from "@/lib/types";
import { Badge } from "@/components/shared/Badge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";

interface MarketplaceRecommendationCardProps {
  recommendation: MarketplaceRecommendation;
  selected: boolean;
  onToggle: () => void;
}

export function MarketplaceRecommendationCard({
  recommendation,
  selected,
  onToggle,
}: MarketplaceRecommendationCardProps) {
  return (
    <div
      className="mirakl-card-elevated rounded-3xl p-5 transition-all"
      style={{
        border: `1px solid ${selected ? "#2764FF" : "#E2E8F0"}`,
        boxShadow: selected ? "0 12px 28px rgba(39,100,255,0.12)" : undefined,
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-bold" style={{ color: "#03182F" }}>
              {recommendation.marketplaceName}
            </h3>
            <Badge tone="slate">{recommendation.region}</Badge>
          </div>
          <p className="mt-2 text-[13px]" style={{ color: "#4F5E70" }}>
            {recommendation.heroStat}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[28px] font-bold leading-none" style={{ color: "#2764FF" }}>
              {Math.round(recommendation.score)}
            </p>
            <p className="text-[11px]" style={{ color: "#6C7B8B" }}>
              score match
            </p>
          </div>
          <PriorityBadge score={recommendation.score} />
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-5 w-5 rounded"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
            Why it matches
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.whyItMatches.map((reason) => (
              <Badge key={reason} tone="blue">
                {reason}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
            Caution
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.cautions.map((reason) => (
              <Badge key={reason} tone="amber">
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
            Matching signals
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.matchingSignals.slice(0, 3).map((signal) => (
              <Badge key={signal} tone="green">
                {signal}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
            Roles to scrape
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.rolesToScrape.slice(0, 3).map((role) => (
              <Badge key={role} tone="pink">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
