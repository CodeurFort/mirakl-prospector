"use client";

import type { ProspectionMode } from "@/lib/types";
import { useT } from "@/lib/i18n";

const MODES: { key: ProspectionMode; labelKey: string; subKey: string }[] = [
  { key: "bulk", labelKey: "mode.bulk.label", subKey: "mode.bulk.sub" },
  { key: "specific", labelKey: "mode.specific.label", subKey: "mode.specific.sub" },
];

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: ProspectionMode;
  onChange: (m: ProspectionMode) => void;
}) {
  const t = useT();
  return (
    <div className="flex gap-2">
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className="flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all"
            style={{
              background: active ? "#2764FF" : "#FFFFFF",
              color: active ? "#FFFFFF" : "#03182F",
              border: active ? "none" : "1px solid #E2E8F0",
              minWidth: 140,
            }}
          >
            <span className="text-[13px] font-bold">{t(m.labelKey)}</span>
            <span
              className="text-[11px] mt-0.5"
              style={{ opacity: active ? 0.8 : 0.5 }}
            >
              {t(m.subKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
