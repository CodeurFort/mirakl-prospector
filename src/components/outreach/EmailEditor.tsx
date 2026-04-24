"use client";

import { useState } from "react";
import type { DraftEmail } from "@/lib/types";

interface EmailEditorProps {
  email: DraftEmail;
  onEdit: (patch: Partial<DraftEmail>) => void;
}

export function EmailEditor({ email, onEdit }: EmailEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(email.subject);
  const [editBody, setEditBody] = useState(email.body);

  function startEditing() {
    setEditSubject(email.subject);
    setEditBody(email.body);
    setEditing(true);
  }

  function saveEdit() {
    onEdit({ subject: editSubject, body: editBody });
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg p-6" style={{ background: "#F2F8FF", border: "2px solid #2764FF" }}>
        <div className="mb-4">
          <label className="text-[11px] font-bold block mb-1" style={{ color: "#6B7280" }}>Objet</label>
          <input
            type="text"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30"
            style={{ color: "#03182F", border: "1px solid #E2E8F0" }}
          />
        </div>
        <div className="mb-4">
          <label className="text-[11px] font-bold block mb-1" style={{ color: "#6B7280" }}>Corps du mail</label>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-lg text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2764FF]/30 resize-y"
            style={{ color: "#30373E", border: "1px solid #E2E8F0" }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={cancelEdit}
            className="px-4 py-2 rounded-lg text-[12px] font-bold"
            style={{ border: "1px solid #E2E8F0", color: "#6B7280" }}
          >
            Annuler
          </button>
          <button
            onClick={saveEdit}
            className="px-4 py-2 rounded-lg text-[12px] font-bold"
            style={{ background: "#2764FF", color: "#FFFFFF" }}
          >
            Sauvegarder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-6 relative group" style={{ background: "#F2F8FF" }}>
      <button
        onClick={startEditing}
        className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "#2764FF", color: "#FFFFFF" }}
      >
        Éditer
      </button>
      <p className="font-bold mb-4 pb-3" style={{ fontSize: 14, color: "#03182F", borderBottom: "1px solid #D4E4FF" }}>
        Objet : {email.subject}
      </p>
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "#30373E" }}>
        {email.body}
      </div>
    </div>
  );
}
