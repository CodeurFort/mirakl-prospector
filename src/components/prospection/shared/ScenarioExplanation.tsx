import type { ProspectionMode } from "@/lib/types";

interface ScenarioExplanationProps {
  mode: ProspectionMode;
  operatorCount?: number;
}

export function ScenarioExplanation({
  mode,
  operatorCount = 0,
}: ScenarioExplanationProps) {
  const copy =
    mode === "specific"
      ? `Brand name + domain servent a produire un profil vendeur, puis a le comparer a ${operatorCount || "plusieurs"} profils marketplaces partages via Supabase.`
      : `Les filtres pilotent la selection des sellers Supabase, puis le moteur BDR recalcule un score multicritere et une strategie d'outreach explicable.`;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#F7FAFD", border: "1px solid #E2E8F0" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
        Scenario
      </p>
      <p className="mt-2 text-[13px] leading-6" style={{ color: "#425063" }}>
        {copy}
      </p>
    </div>
  );
}
