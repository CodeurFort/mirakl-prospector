interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}

export function MetricCard({ label, value, hint, accent = "#2764FF" }: MetricCardProps) {
  return (
    <div className="mirakl-card-elevated rounded-2xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#708093" }}>
        {label}
      </p>
      <p className="mt-2 text-[28px] font-bold leading-none" style={{ color: accent }}>
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[12px]" style={{ color: "#5B6777" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
