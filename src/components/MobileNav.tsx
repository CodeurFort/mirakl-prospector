"use client";

import Image from "next/image";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useLanguage, useT } from "@/lib/i18n";
import type { ActiveTab } from "@/lib/types";

const tabs: { key: ActiveTab; labelKey: string }[] = [
  { key: "prospection", labelKey: "nav.prospection" },
  { key: "outreach", labelKey: "nav.outreach" },
  { key: "pipeline", labelKey: "nav.pipeline" },
];

export function MobileNav() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const outreachCount = useWorkspaceStore((s) => s.sellers.length);
  const t = useT();
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);

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
        <div className="flex items-center gap-2">
          <Image
            src="/logo-mirakl.png"
            alt="Mirakl"
            width={80}
            height={18}
            priority
            className="h-[18px] w-auto"
          />
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Prospector
          </span>
        </div>

        {/* Compact language toggle on mobile */}
        <button
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
          className="text-[11px] font-bold px-2 py-1 rounded-md uppercase"
          style={{ background: "rgba(255,255,255,0.1)", color: "#FFFFFF" }}
          aria-label="Toggle language"
        >
          {lang}
        </button>
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
              <span className="text-[11px] font-bold">{t(tab.labelKey)}</span>
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
