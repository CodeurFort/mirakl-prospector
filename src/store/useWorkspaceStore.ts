"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveTab,
  SpecificCampaign,
  SellerCampaignRecord,
  DraftEmail,
  PipelineStage,
  Seller,
  MarketplaceRecommendation,
  WorkspaceAnalysis,
  OutreachStrategy,
} from "@/lib/types";
import { createDefaultStrategy } from "@/lib/bdr-engine";

interface WorkspaceState {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  sellers: SellerCampaignRecord[];
  specificCampaigns: SpecificCampaign[];
  lastAnalysis: WorkspaceAnalysis | null;
  campaignEmphasisMarketplaces: Record<string, string[]>;

  ingestAnalysis: (analysis: WorkspaceAnalysis & {
    brandName?: string;
    companyDomain?: string;
    roles?: string[];
    marketplaces?: MarketplaceRecommendation[];
    source?: SpecificCampaign["source"];
    statusMessage?: string;
  }) => string | null;
  toggleCampaignMarketplace: (campaignId: string, mpId: string) => void;
  transferSpecificCampaign: (campaignId: string) => void;
  transferToOutreach: (
    record: Omit<SellerCampaignRecord, "id" | "pushedAt" | "pipelineStage" | "emails">
  ) => void;
  returnToProspection: (recordId: string) => void;
  updateStrategy: (recordId: string, strategy: Partial<OutreachStrategy>) => void;
  setEmails: (recordId: string, emails: DraftEmail[]) => void;
  editEmail: (
    recordId: string,
    mailNum: 1 | 2 | 3,
    patch: Partial<DraftEmail>
  ) => void;
  isInOutreach: (sellerId: string) => boolean;
  advanceStage: (recordId: string) => void;
  regressStage: (recordId: string) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeTab: "prospection" as ActiveTab,
      setActiveTab: (tab) => set({ activeTab: tab }),

      sellers: [],
      specificCampaigns: [],
      lastAnalysis: null,
      campaignEmphasisMarketplaces: {},

      ingestAnalysis: (analysis) => {
        set({ lastAnalysis: analysis });
        if (analysis.kind !== "specific" || !analysis.marketplaces) {
          return null;
        }
        const id = generateId();
        const campaign: SpecificCampaign = {
          id,
          brandName: analysis.brandName || "",
          companyDomain: analysis.companyDomain || "",
          selectedMarketplaceIds: [],
          roles: analysis.roles || [],
          marketplaces: analysis.marketplaces,
          source: analysis.source || "fallback_existing_marketplaces",
          statusMessage: analysis.statusMessage,
          pipelineStage: "ready",
          createdAt: new Date().toISOString(),
          transferredAt: null,
        };
        set((s) => ({
          specificCampaigns: [campaign, ...s.specificCampaigns],
          campaignEmphasisMarketplaces: {
            ...s.campaignEmphasisMarketplaces,
            [id]: [],
          },
        }));
        return id;
      },
      toggleCampaignMarketplace: (campaignId, mpId) =>
        set((s) => ({
          specificCampaigns: s.specificCampaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  selectedMarketplaceIds: c.selectedMarketplaceIds.includes(
                    mpId
                  )
                    ? c.selectedMarketplaceIds.filter((id) => id !== mpId)
                      : [...c.selectedMarketplaceIds, mpId],
                }
              : c
          ),
          campaignEmphasisMarketplaces: {
            ...s.campaignEmphasisMarketplaces,
            [campaignId]: s.campaignEmphasisMarketplaces[campaignId]?.includes(mpId)
              ? (s.campaignEmphasisMarketplaces[campaignId] || []).filter((id) => id !== mpId)
              : [...(s.campaignEmphasisMarketplaces[campaignId] || []), mpId],
          },
        })),
      transferSpecificCampaign: (campaignId) =>
        set((s) => ({
          activeTab: "outreach",
          specificCampaigns: s.specificCampaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  pipelineStage: "in_sequence" as PipelineStage,
                  transferredAt: new Date().toISOString(),
                }
              : c
          ),
        })),

      transferToOutreach: (record) => {
        if (get().sellers.some((item) => item.seller.id === record.seller.id)) return;
        const storedRecord: SellerCampaignRecord = {
          id: generateId(),
          ...record,
          strategy: {
            ...createDefaultStrategy(),
            ...record.strategy,
          },
          emails: [],
          contacts: record.contacts || [],
          pipelineStage: "ready",
          pushedAt: new Date().toISOString(),
        };
        set((s) => ({
          sellers: [storedRecord, ...s.sellers],
        }));
      },
      returnToProspection: (recordId) =>
        set((s) => ({
          sellers: s.sellers.filter((record) => record.id !== recordId),
        })),
      updateStrategy: (recordId, strategy) =>
        set((s) => ({
          sellers: s.sellers.map((record) =>
            record.id === recordId
              ? {
                  ...record,
                  strategy: {
                    ...record.strategy,
                    ...strategy,
                  },
                }
              : record
          ),
        })),
      setEmails: (recordId, emails) =>
        set((s) => ({
          sellers: s.sellers.map((r) =>
            r.id === recordId ? { ...r, emails } : r
          ),
        })),
      editEmail: (recordId, mailNum, patch) =>
        set((s) => ({
          sellers: s.sellers.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  emails: r.emails.map((e) =>
                    e.mailNumber === mailNum ? { ...e, ...patch } : e
                  ),
                }
              : r
          ),
        })),
      isInOutreach: (sellerId) =>
        get().sellers.some((record) => record.seller.id === sellerId),

      advanceStage: (recordId) => {
        const record = get().sellers.find((r) => r.id === recordId);
        if (!record) return;
        const next: Record<PipelineStage, PipelineStage | null> = {
          ready: "in_sequence",
          in_sequence: "sent",
          sent: "replied",
          replied: null,
        };
        const nextStage = next[record.pipelineStage];
        if (!nextStage) return;
        set((s) => ({
          sellers: s.sellers.map((r) =>
            r.id === recordId ? { ...r, pipelineStage: nextStage } : r
          ),
        }));
      },
      regressStage: (recordId) => {
        const previous: Record<PipelineStage, PipelineStage | null> = {
          ready: null,
          in_sequence: "ready",
          sent: "in_sequence",
          replied: "sent",
        };
        const record = get().sellers.find((item) => item.id === recordId);
        const previousStage = record ? previous[record.pipelineStage] : null;
        if (!record || !previousStage) return;
        set((s) => ({
          sellers: s.sellers.map((item) =>
            item.id === recordId
              ? { ...item, pipelineStage: previousStage }
              : item
          ),
        }));
      },
    }),
    {
      name: "mirakl-workspace-v3",
      partialize: (state) => ({
        activeTab: state.activeTab,
        sellers: state.sellers,
        specificCampaigns: state.specificCampaigns,
        lastAnalysis: state.lastAnalysis,
        campaignEmphasisMarketplaces: state.campaignEmphasisMarketplaces,
      }),
    }
  )
);
