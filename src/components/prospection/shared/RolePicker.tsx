"use client";

import { useState } from "react";
import { TARGET_ROLE_OPTIONS } from "@/lib/bdr-engine";
import { Badge } from "@/components/shared/Badge";

interface RolePickerProps {
  value: string[];
  onChange: (roles: string[]) => void;
}

export function RolePicker({ value, onChange }: RolePickerProps) {
  const [manualRole, setManualRole] = useState("");

  function toggleRole(role: string) {
    onChange(
      value.includes(role) ? value.filter((item) => item !== role) : [...value, role]
    );
  }

  function addManualRole() {
    const trimmed = manualRole.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setManualRole("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TARGET_ROLE_OPTIONS.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleRole(option.value)}
              className="rounded-full px-3 py-1.5 text-[12px] font-bold transition-all"
              style={{
                background: active ? "#03182F" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#03182F",
                border: `1px solid ${active ? "#03182F" : "#D6DEE8"}`,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={manualRole}
          onChange={(event) => setManualRole(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addManualRole();
            }
          }}
          placeholder="Ajouter un role manuel"
          className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none"
          style={{ borderColor: "#D6DEE8", color: "#03182F", background: "#FFFFFF" }}
        />
        <button
          type="button"
          onClick={addManualRole}
          className="rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: "#E8F0FF", color: "#2251CC" }}
        >
          Ajouter
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((role) => (
            <button key={role} type="button" onClick={() => toggleRole(role)}>
              <Badge tone="blue">{role} ×</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
