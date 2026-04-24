"use client";

import { useState } from "react";
import type { DraftEmail, SellerRecord } from "@/lib/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useT } from "@/lib/i18n";
import { InfoChip } from "@/components/shared/InfoChip";
import { Badge } from "@/components/shared/Badge";
import { EmailSequence } from "./EmailSequence";
import { StrategyEditor } from "./StrategyEditor";

interface SellerDetailProps {
  record: SellerRecord;
  onBack: () => void;
}

export function SellerDetail({ record, onBack }: SellerDetailProps) {
  const t = useT();
  const seller = record.seller;
  const score = record.totalScore || seller.match_score || 0;
  const priority = score >= 88 ? "HOT" : score >= 72 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";
  const priorityStyle =
    priority === "HOT"
      ? { bg: "#FFE9E9", color: "#B42318" }
      : priority === "HIGH"
        ? { bg: "#E8F5E9", color: "#2E7D32" }
        : priority === "MEDIUM"
          ? { bg: "#FFF3E0", color: "#E65100" }
          : { bg: "#FFE7EC", color: "#770031" };
  const priorityLabelKey =
    priority === "HOT" ? "priority.hot"
    : priority === "HIGH" ? "priority.high"
    : priority === "MEDIUM" ? "priority.medium"
    : "priority.low";

  const setEmails = useWorkspaceStore((s) => s.setEmails);
  const editEmail = useWorkspaceStore((s) => s.editEmail);
  const updateStrategy = useWorkspaceStore((s) => s.updateStrategy);
  const returnToProspection = useWorkspaceStore((s) => s.returnToProspection);
  const [generatingMail, setGeneratingMail] = useState<number | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function triggerEnrichment() {
    setEnrichStatus("loading");
    try {
      const res = await fetch("/api/enrich-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: seller.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur");
      setEnrichStatus("done");
      setTimeout(() => setEnrichStatus("idle"), 4000);
    } catch {
      setEnrichStatus("error");
      setTimeout(() => setEnrichStatus("idle"), 3000);
    }
  }

  async function generateMail(mailNumber: 1 | 2 | 3, customInstructions?: string) {
    setGeneratingMail(mailNumber);
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: seller.id,
          mailNumber,
          strategy: record.strategy,
          customInstructions,
          mailTiming: mailNumber === 1 ? "J0"
            : mailNumber === 2 ? `J+${record.strategy.emailGap1Days ?? 5}`
            : `J+${(record.strategy.emailGap1Days ?? 5) + (record.strategy.emailGap2Days ?? 7)}`,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newEmail: DraftEmail = {
        id: `${record.id}-mail${mailNumber}`,
        mailNumber,
        timing: data.timing,
        subject: data.subject,
        body: data.body,
        status: "draft",
      };

      const existingEmails = [...record.emails];
      const index = existingEmails.findIndex((email) => email.mailNumber === mailNumber);
      if (index >= 0) {
        existingEmails[index] = newEmail;
      } else {
        existingEmails.push(newEmail);
      }
      existingEmails.sort((left, right) => left.mailNumber - right.mailNumber);

      setEmails(record.id, existingEmails);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingMail(null);
    }
  }

  async function generateAllMails() {
    for (const number of [1, 2, 3] as const) {
      await generateMail(number);
    }
  }

  function handleEditEmail(mailNum: 1 | 2 | 3, patch: Partial<DraftEmail>) {
    editEmail(record.id, mailNum, patch);
  }

  return (
    <div className="p-4 pt-[68px] lg:pt-4 lg:p-8 pb-16 lg:pb-8" style={{ maxWidth: 1100 }}>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-[13px] font-bold lg:mb-6" style={{ color: "#2764FF" }}>
        ← {t("outreach.back")}
      </button>

      <div className="mirakl-card-elevated mb-4 animate-fade-in p-4 lg:mb-6 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 22, lineHeight: "32px", color: "#03182F" }}>
              {seller.seller_name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4">
              <InfoChip label={t("accounts.category")} value={seller.category?.label || "—"} />
              <InfoChip label={t("bulk.filters.country")} value={seller.country?.code || "—"} />
              <InfoChip label={t("bulk.filters.price")} value={seller.price_category?.label || "—"} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-[36px] font-bold" style={{ color: "#2764FF" }}>{Math.round(score)}</span>
              <span className="text-[16px]" style={{ color: "#6B7280" }}>/100</span>
            </div>
            <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>
              {t(priorityLabelKey)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-lg px-3 py-1.5 text-[12px] font-bold" style={{ background: "#2764FF", color: "#FFFFFF" }}>
            {t("outreach.best_match", { name: record.topRecommendation?.marketplaceName || seller.marketplace?.["marketplace name"] || "—" })}
          </span>
          {seller.amazon_presence && (
            <span className="rounded-lg px-3 py-1.5 text-[12px] font-bold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
              {t("outreach.amazon_fr", { n: seller.amazon_product_count || 0 })}
            </span>
          )}
          <button
            onClick={triggerEnrichment}
            disabled={enrichStatus === "loading"}
            className="rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-50"
            style={{
              background: enrichStatus === "done" ? "#E8F5E9" : enrichStatus === "error" ? "#FFE9E9" : "#F2F8FF",
              color: enrichStatus === "done" ? "#2E7D32" : enrichStatus === "error" ? "#B42318" : "#2764FF",
            }}
          >
            {enrichStatus === "loading" ? t("outreach.enrich_searching") : enrichStatus === "done" ? t("outreach.enrich_done") : enrichStatus === "error" ? t("outreach.enrich_error") : t("outreach.enrich_contacts")}
          </button>
          <button
            onClick={() => {
              returnToProspection(record.id);
              onBack();
            }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
            style={{ background: "#FFE9E9", color: "#B42318" }}
          >
            {t("outreach.return_prospection")}
          </button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0" }}>
            <p className="mb-3 text-[12px] font-bold" style={{ color: "#03182F" }}>{t("outreach.score_breakdown")}</p>
            <div className="space-y-3">
              {record.scoreBreakdown.map((criterion) => (
                <div key={criterion.key}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-bold" style={{ color: "#03182F" }}>
                      {criterion.label}
                    </span>
                    <span className="text-[12px]" style={{ color: "#6C7B8B" }}>
                      {criterion.score}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "#E7EDF5" }}>
                    <div className="h-full rounded-full" style={{ width: `${criterion.score}%`, background: "#2764FF" }} />
                  </div>
                  <p className="mt-1 text-[11px]" style={{ color: "#607082" }}>
                    {criterion.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0" }}>
              <p className="mb-3 text-[12px] font-bold" style={{ color: "#03182F" }}>{t("outreach.signals")}</p>
              <div className="flex flex-wrap gap-2">
                {record.signals.map((signal) => (
                  <Badge key={signal} tone="green">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0" }}>
              <p className="mb-3 text-[12px] font-bold" style={{ color: "#03182F" }}>{t("outreach.top_operators")}</p>
              <div className="space-y-2">
                {record.operatorScores.slice(0, 4).map((operator) => (
                  <div key={operator.marketplaceId} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7FAFD] px-3 py-2">
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: "#03182F" }}>
                        {operator.marketplaceName}
                      </p>
                      <p className="text-[11px]" style={{ color: "#607082" }}>
                        {operator.region}
                      </p>
                    </div>
                    <Badge tone="blue">{Math.round(operator.totalScore)}/100</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mirakl-card-elevated mb-4 p-4 lg:mb-6 lg:p-6">
        <p className="mb-4 text-[12px] font-bold" style={{ color: "#03182F" }}>
          {t("outreach.strategy_title")}
        </p>
        <StrategyEditor value={record.strategy} onChange={(patch) => updateStrategy(record.id, patch)} />
      </div>

      <EmailSequence
        record={record}
        generatingMail={generatingMail}
        onGenerateMail={generateMail}
        onGenerateAll={generateAllMails}
        onEditEmail={handleEditEmail}
      />
    </div>
  );
}
