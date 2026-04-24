"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ActiveTab } from "@/lib/types";

const tabs: { key: ActiveTab; label: string }[] = [
  { key: "prospection", label: "Prospection" },
  { key: "outreach", label: "Outreach" },
  { key: "pipeline", label: "Pipeline" },
];

export function MobileNav() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const outreachCount = useWorkspaceStore((s) => s.sellers.length);

  return (
    <>
      {/* Top bar — mobile only */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: "#03182F",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-[12px] font-bold"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            M
          </div>
          <span className="text-[14px] font-bold" style={{ color: "#FFFFFF" }}>
            Mirakl Prospector
          </span>
        </div>
      </div>

      {/* Bottom tab bar — mobile only */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "#03182F",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative"
              style={{
                color: active ? "#2764FF" : "rgba(255,255,255,0.4)",
              }}
            >
              <span className="text-[11px] font-bold">{tab.label}</span>
              {tab.key === "outreach" && outreachCount > 0 && (
                <span
                  className="absolute top-2 right-1/4 text-[8px] font-bold px-1 py-px rounded-full"
                  style={{ background: "#F22E75", color: "#FFFFFF" }}
                >
                  {outreachCount}
                </span>
              )}
              {active && (
                <div
                  className="absolute top-0 left-4 right-4 h-[2px]"
                  style={{ background: "#2764FF" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
