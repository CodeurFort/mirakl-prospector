interface BadgeProps {
  children: React.ReactNode;
  tone?: "blue" | "pink" | "green" | "amber" | "slate" | "red";
}

const TONES = {
  blue: { background: "#E8F0FF", color: "#2251CC" },
  pink: { background: "#FFEAF3", color: "#B02158" },
  green: { background: "#EAF8EF", color: "#237A45" },
  amber: { background: "#FFF4E2", color: "#AD6400" },
  slate: { background: "#F3F6FA", color: "#516072" },
  red: { background: "#FFE9E9", color: "#B42318" },
};

export function Badge({ children, tone = "slate" }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={TONES[tone]}
    >
      {children}
    </span>
  );
}
