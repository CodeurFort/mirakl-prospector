"use client";

interface CampaignConfirmProps {
  marketplaceName: string;
  selectedCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function CampaignConfirm({ marketplaceName, selectedCount, onConfirm, onClose }: CampaignConfirmProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-fade-in">
        <div className="mirakl-card-elevated p-6">
          <h3 className="text-[18px] font-bold mb-2" style={{ color: "#03182F" }}>
            Créer un brief Outreach
          </h3>
          <p className="text-[14px] mb-6" style={{ color: "#6B7280" }}>
            {selectedCount} seller{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""} pour la marketplace <strong style={{ color: "#03182F" }}>{marketplaceName}</strong> seront ajoutés à votre onglet Outreach.
          </p>

          <div className="rounded-lg p-4 mb-6" style={{ background: "#F2F8FF" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2764FF" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: "#03182F" }}>
                  {selectedCount} sellers → Outreach
                </p>
                <p className="text-[11px]" style={{ color: "#6B7280" }}>
                  Vous pourrez générer les emails depuis l&apos;onglet Outreach
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-[13px] font-bold"
              style={{ border: "1px solid #E2E8F0", color: "#03182F" }}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-lg text-[13px] font-bold transition-all hover:shadow-lg"
              style={{ background: "#2764FF", color: "#FFFFFF" }}
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
