export function ROICard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="mirakl-card p-4 text-center">
      <p className="text-[11px] font-bold" style={{ color: "#6B7280" }}>
        {label}
      </p>
      <p className="text-[22px] font-bold mt-1" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "#6B7280" }}>
        {sub}
      </p>
    </div>
  );
}
