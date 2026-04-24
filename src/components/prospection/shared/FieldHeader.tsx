interface FieldHeaderProps {
  label: string;
  hint: string;
}

export function FieldHeader({ label, hint }: FieldHeaderProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <p className="text-[12px] font-bold" style={{ color: "#03182F" }}>
          {label}
        </p>
      </div>
      <p className="text-[11px] leading-5" style={{ color: "#607082" }}>
        {hint}
      </p>
    </div>
  );
}
