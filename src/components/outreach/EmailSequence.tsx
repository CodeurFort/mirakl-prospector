"use client";

import { useState } from "react";
import type { SellerRecord, DraftEmail } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { EmailEditor } from "./EmailEditor";

interface EmailSequenceProps {
  record: SellerRecord;
  generatingMail: number | null;
  onGenerateMail: (n: 1 | 2 | 3, customInstructions?: string) => void;
  onGenerateAll: () => void;
  onEditEmail: (mailNum: 1 | 2 | 3, patch: Partial<DraftEmail>) => void;
}

const TEST_RECIPIENT = "abingangoye@eugeniaschool.com";

export function EmailSequence({ record, generatingMail, onGenerateMail, onGenerateAll, onEditEmail }: EmailSequenceProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendError, setSendError] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  const gap1 = record.strategy.emailGap1Days ?? 5;
  const gap2 = record.strategy.emailGap2Days ?? 7;
  const TABS = [
    { n: 1 as const, labelKey: "emails.tab1", timing: "J0" },
    { n: 2 as const, labelKey: "emails.tab2", timing: `J+${gap1}` },
    { n: 3 as const, labelKey: "emails.tab3", timing: `J+${gap1 + gap2}` },
  ];

  const currentEmail = record.emails.find((e) => e.mailNumber === activeTab);
  const sellerEmail = record.seller.contact_email || "";
  const defaultRecipient = sellerEmail || TEST_RECIPIENT;

  function copyToClipboard() {
    if (!currentEmail) return;
    const text = `Objet : ${currentEmail.subject}\n\n${currentEmail.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendEmail() {
    if (!currentEmail) return;
    const to = window.prompt("Envoyer à :", defaultRecipient);
    if (!to) return;

    setSendStatus("sending");
    setSendError("");
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: currentEmail.subject,
          body: currentEmail.body,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur d'envoi");
      setSendStatus("sent");
      setTimeout(() => setSendStatus("idle"), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'envoi";
      setSendError(message);
      setSendStatus("error");
      setTimeout(() => setSendStatus("idle"), 5000);
    }
  }

  return (
    <div className="mirakl-card-elevated overflow-hidden animate-fade-in" style={{ animationDelay: "100ms" }}>
      {/* Header */}
      <div className="p-4 lg:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: "2px solid #E2E8F0" }}>
        <div>
          <h2 className="font-bold" style={{ fontSize: 18, lineHeight: "28px", color: "#03182F" }}>
            {t("emails.title")}
          </h2>
          <p className="text-[14px] mt-1" style={{ color: "#30373E" }}>
            {t("emails.subtitle")}
          </p>
        </div>
        <button
          onClick={onGenerateAll}
          disabled={generatingMail !== null}
          className="px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-lg disabled:opacity-50"
          style={{ background: "#2764FF", color: "#FFFFFF" }}
        >
          {generatingMail !== null ? t("emails.generating", { n: generatingMail }) : t("emails.generate_all")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid #E2E8F0" }}>
        {TABS.map(({ n, labelKey, timing }) => {
          const email = record.emails.find((e) => e.mailNumber === n);
          return (
            <button
              key={n}
              onClick={() => setActiveTab(n)}
              className="flex-1 min-w-0 px-2 lg:px-4 py-3 text-[12px] lg:text-[14px] font-bold transition-all relative"
              style={{
                color: activeTab === n ? "#2764FF" : "#6B7280",
                background: activeTab === n ? "#F2F8FF" : "transparent",
              }}
            >
              <span className="text-[11px] font-normal block" style={{ color: "#6B7280" }}>{timing}</span>
              Mail {n} — {t(labelKey)}
              {email && <span className="ml-1.5 text-[10px]" style={{ color: "#2E7D32" }}>✓</span>}
              {activeTab === n && <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "#2764FF" }} />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        {currentEmail ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold" style={{ color: "#6B7280" }}>{currentEmail.timing}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onGenerateMail(activeTab)}
                  disabled={generatingMail !== null}
                  className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors disabled:opacity-50"
                  style={{ border: "1px solid #E2E8F0", color: "#03182F" }}
                >
                  {t("emails.regenerate")}
                </button>
                <button
                  onClick={() => setShowCustomPrompt((s) => !s)}
                  disabled={generatingMail !== null}
                  className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    border: "1px solid #F22E75",
                    color: showCustomPrompt ? "#FFFFFF" : "#F22E75",
                    background: showCustomPrompt ? "#F22E75" : "transparent",
                  }}
                >
                  {showCustomPrompt ? t("emails.custom_prompt_close") : t("emails.custom_prompt")}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all"
                  style={{ background: "#03182F", color: "#FFFFFF" }}
                >
                  {copied ? t("emails.copied") : t("emails.copy")}
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sendStatus === "sending"}
                  className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all disabled:opacity-50"
                  style={{
                    background:
                      sendStatus === "sent" ? "#2E7D32"
                        : sendStatus === "error" ? "#B42318"
                        : "#2764FF",
                    color: "#FFFFFF",
                  }}
                  title={sendStatus === "error" ? sendError : `${t("emails.send")} → ${defaultRecipient}`}
                >
                  {sendStatus === "sending" ? t("emails.sending")
                    : sendStatus === "sent" ? t("emails.sent")
                    : sendStatus === "error" ? t("outreach.enrich_error")
                    : t("emails.send")}
                </button>
              </div>
            </div>
            {showCustomPrompt && (
              <div className="mb-4 rounded-xl p-3" style={{ background: "#FFF0F5", border: "1px solid #F22E75" }}>
                <label className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#F22E75" }}>
                  {t("emails.custom_prompt_label")}
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t("emails.custom_prompt_placeholder")}
                  rows={3}
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                  style={{ borderColor: "#F22E75", background: "#FFFFFF" }}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      onGenerateMail(activeTab, customPrompt.trim() || undefined);
                    }}
                    disabled={generatingMail !== null || !customPrompt.trim()}
                    className="px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all disabled:opacity-50"
                    style={{ background: "#F22E75", color: "#FFFFFF" }}
                  >
                    {generatingMail === activeTab ? t("emails.custom_prompt_loading") : t("emails.custom_prompt_cta")}
                  </button>
                </div>
              </div>
            )}
            <EmailEditor
              email={currentEmail}
              onEdit={(patch) => onEditEmail(activeTab, patch)}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            {generatingMail === activeTab ? (
              <div className="animate-fade-in">
                <div className="inline-block w-10 h-10 border-3 rounded-full animate-spin mb-4" style={{ borderColor: "#E2E8F0", borderTopColor: "#2764FF" }} />
                <p className="text-[14px] font-bold" style={{ color: "#03182F" }}>{t("emails.generating_full", { n: activeTab })}</p>
                <p className="text-[12px] mt-2" style={{ color: "#6B7280" }}>{t("emails.generating_hint")}</p>
              </div>
            ) : (
              <div>
                <p className="text-[14px] mb-4" style={{ color: "#6B7280" }}>{t("emails.empty")}</p>
                <button
                  onClick={() => onGenerateMail(activeTab)}
                  className="px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all hover:shadow-lg"
                  style={{ background: "#2764FF", color: "#FFFFFF" }}
                >
                  {t("emails.generate_one", { n: activeTab })}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
