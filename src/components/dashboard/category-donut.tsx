const CATEGORIES = [
  { label: "Bydlení",  pct: 0.38, color: "oklch(0.68 0.2  300)" },
  { label: "Jídlo",    pct: 0.22, color: "oklch(0.60 0.22 270)" },
  { label: "Doprava",  pct: 0.14, color: "oklch(0.52 0.2  255)" },
  { label: "Zábava",   pct: 0.12, color: "oklch(0.45 0.18 245)" },
  { label: "Ostatní",  pct: 0.14, color: "oklch(0.32 0.06 255)" },
];

export function CategoryDonut() {
  const r    = 58;
  const cx   = 75;
  const cy   = 75;
  const circ = 2 * Math.PI * r;
  let cum    = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={150} height={150} viewBox="0 0 150 150" aria-hidden="true" className="shrink-0">
        {CATEGORIES.map(({ label, pct, color }) => {
          const start = cum;
          cum += pct;
          return (
            <circle
              key={label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth={20}
              strokeDasharray={`${pct * circ} ${circ}`}
              strokeDashoffset={circ * (1 - start)}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        {/* Donut hole */}
        <circle cx={cx} cy={cy} r={38} fill="oklch(0.155 0.007 78)" />
      </svg>

      <ul className="flex flex-col gap-2">
        {CATEGORIES.map(({ label, pct, color }) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <span className="ml-3 text-[13px] font-medium tabular-nums text-foreground">
              {Math.round(pct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
