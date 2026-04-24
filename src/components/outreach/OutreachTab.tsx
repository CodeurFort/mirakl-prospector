"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useT } from "@/lib/i18n";
import { SellerAccounts } from "./SellerAccounts";
import { SellerDetail } from "./SellerDetail";

export function OutreachTab() {
  const sellerRecords = useWorkspaceStore((s) => s.sellers);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const t = useT();

  const selectedRecord = sellerRecords.find((record) => record.id === selectedRecordId);

  if (selectedRecord) {
    return <SellerDetail record={selectedRecord} onBack={() => setSelectedRecordId(null)} />;
  }

  const hasRecords = sellerRecords.length > 0;

  return (
    <div className="p-4 pt-[68px] lg:pt-4 lg:p-8 pb-16 lg:pb-8" style={{ maxWidth: 1200 }}>
      <div className="mb-6">
        <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F" }}>
          {t("outreach.title")}
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "#30373E" }}>
          {t("outreach.subtitle")}
        </p>
      </div>

      {!hasRecords && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#F2F8FF", border: "1px solid #E2E8F0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <p className="text-[16px] font-bold" style={{ color: "#03182F" }}>{t("outreach.empty_title")}</p>
          <p className="mt-2 text-[13px]" style={{ color: "#6B7280" }}>
            {t("outreach.empty_hint")}
          </p>
        </div>
      )}

      {hasRecords && (
        <div>
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: "#03182F" }}>
            {t("outreach.accounts_title", { n: sellerRecords.length })}
          </h2>
          <SellerAccounts onSelect={setSelectedRecordId} />
        </div>
      )}
    </div>
  );
}
