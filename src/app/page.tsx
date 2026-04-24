"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { ProspectionTab } from "@/components/prospection/ProspectionTab";
import { OutreachTab } from "@/components/outreach/OutreachTab";
import { PipelineTab } from "@/components/pipeline/PipelineTab";

export default function HomePage() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);

  switch (activeTab) {
    case "prospection":
      return <ProspectionTab />;
    case "outreach":
      return <OutreachTab />;
    case "pipeline":
      return <PipelineTab />;
    default:
      return <ProspectionTab />;
  }
}
