export function PriorityBadge({ score }: { score: number }) {
  const priority = score >= 88 ? "HOT" : score >= 72 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";
  const style =
    priority === "HOT"
      ? { bg: "#FFE9E9", color: "#B42318" }
      : priority === "HIGH"
      ? { bg: "#E8F5E9", color: "#2E7D32" }
      : priority === "MEDIUM"
        ? { bg: "#FFF3E0", color: "#E65100" }
        : { bg: "#FFE7EC", color: "#770031" };

  return (
    <span
      className="px-2 py-0.5 text-[11px] font-bold rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {priority}
    </span>
  );
}
