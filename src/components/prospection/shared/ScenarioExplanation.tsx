"use client";

import type { ProspectionMode } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface ScenarioExplanationProps {
  mode: ProspectionMode;
  operatorCount?: number;
}

export function ScenarioExplanation({
  mode,
  operatorCount = 0,
}: ScenarioExplanationProps) {
  const t = useT();
  const copy =
    mode === "specific"
      ? t("scenario.specific", { n: operatorCount || "several" })
      : t("scenario.bulk");

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#F7FAFD", border: "1px solid #E2E8F0" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
        {t("scenario.header")}
      </p>
      <p className="mt-2 text-[13px] leading-6" style={{ color: "#425063" }}>
        {copy}
      </p>
    </div>
  );
}
