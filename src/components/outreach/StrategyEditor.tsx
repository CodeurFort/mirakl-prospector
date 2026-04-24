"use client";

import type { OutreachStrategy } from "@/lib/types";
import {
  OUTREACH_ANGLE_OPTIONS,
  OUTREACH_METHOD_OPTIONS,
  SEASONAL_MOMENT_OPTIONS,
} from "@/lib/bdr-engine";

interface StrategyEditorProps {
  value: OutreachStrategy;
  onChange: (patch: Partial<OutreachStrategy>) => void;
}

function StrategySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[12px] font-bold" style={{ color: "#03182F" }}>
        {label}
      </p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border px-3 py-3 text-[13px] outline-none"
        style={{ borderColor: "#D6DEE8", color: "#03182F", background: "#FFFFFF" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} - {option.description}
          </option>
        ))}
      </select>
    </label>
  );
}

function DayGapInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[12px] font-bold" style={{ color: "#03182F" }}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={30}
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(30, Number(e.target.value))))}
          className="w-20 rounded-2xl border px-3 py-3 text-[13px] outline-none text-center"
          style={{ borderColor: "#D6DEE8", color: "#03182F", background: "#FFFFFF" }}
        />
        <span className="text-[12px]" style={{ color: "#6B7280" }}>jours</span>
      </div>
    </label>
  );
}

export function StrategyEditor({ value, onChange }: StrategyEditorProps) {
  const gap1 = value.emailGap1Days ?? 5;
  const gap2 = value.emailGap2Days ?? 7;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <StrategySelect
          label="Methode"
          value={value.method}
          options={OUTREACH_METHOD_OPTIONS}
          onChange={(method) => onChange({ method })}
        />
        <StrategySelect
          label="Angle"
          value={value.angle}
          options={OUTREACH_ANGLE_OPTIONS}
          onChange={(angle) => onChange({ angle })}
        />
        <StrategySelect
          label="Saisonnalite"
          value={value.seasonalMoment}
          options={SEASONAL_MOMENT_OPTIONS}
          onChange={(seasonalMoment) => onChange({ seasonalMoment })}
        />
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0", background: "#F9FBFD" }}>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6F7F90" }}>
          Espacement de la séquence
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#03182F" }}>
            <span className="font-bold">Mail 1</span>
            <span style={{ color: "#6B7280" }}>J0</span>
          </div>
          <span style={{ color: "#D6DEE8" }}>→</span>
          <DayGapInput
            label="Délai avant Mail 2"
            value={gap1}
            onChange={(emailGap1Days) => onChange({ emailGap1Days })}
          />
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#03182F" }}>
            <span className="font-bold">Mail 2</span>
            <span style={{ color: "#6B7280" }}>J+{gap1}</span>
          </div>
          <span style={{ color: "#D6DEE8" }}>→</span>
          <DayGapInput
            label="Délai avant Mail 3"
            value={gap2}
            onChange={(emailGap2Days) => onChange({ emailGap2Days })}
          />
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#03182F" }}>
            <span className="font-bold">Mail 3</span>
            <span style={{ color: "#6B7280" }}>J+{gap1 + gap2}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
