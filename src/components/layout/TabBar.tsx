"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ActiveTab } from "@/lib/types";

const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "prospection",
    label: "Prospection",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    key: "outreach",
    label: "Outreach",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
];

export function TabBar() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const outreachCount = useWorkspaceStore((s) => s.sellers.length);

  return (
    <nav className="flex-1 p-4 space-y-1">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-normal transition-colors group text-left"
            style={{
              background: active ? "rgba(39,100,255,0.12)" : "transparent",
              color: active ? "#FFFFFF" : "rgba(255,255,255,0.7)",
            }}
          >
            <span
              className="transition-opacity"
              style={{
                color: "#2764FF",
                opacity: active ? 1 : 0.7,
              }}
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.key === "outreach" && outreachCount > 0 && (
              <span
                className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#F22E75", color: "#FFFFFF" }}
              >
                {outreachCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
