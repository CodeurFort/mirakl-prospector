"use client";

import { useState } from "react";
import type { ProspectionMode } from "@/lib/types";
import { ModeToggle } from "./ModeToggle";
import { BulkDashboard } from "./bulk/BulkDashboard";
import { SpecificSearch } from "./specific/SpecificSearch";

export function ProspectionTab() {
  const [mode, setMode] = useState<ProspectionMode>("bulk");

  return (
    <div className="h-full flex flex-col">
      {mode === "bulk" ? (
        <BulkDashboard mode={mode} onModeChange={setMode} />
      ) : (
        <SpecificSearch mode={mode} onModeChange={setMode} />
      )}
    </div>
  );
}
