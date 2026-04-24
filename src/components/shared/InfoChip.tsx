export function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg" style={{ background: "#F2F8FF" }}>
      <span className="text-[11px]" style={{ color: "#6B7280" }}>
        {label} :{" "}
      </span>
      <span className="text-[13px] font-bold" style={{ color: "#03182F" }}>
        {value}
      </span>
    </div>
  );
}
