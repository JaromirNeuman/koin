const MONTHS  = ["Aug", "Sep", "Okt", "Nov", "Dec", "Jan"];
const INCOME   = [3050, 3300, 3200, 3600, 3900, 3850];
const EXPENSES = [2100, 2350, 2200, 2700, 2600, 2400];
const Y_LABELS = [1500, 2000, 2500, 3000, 3500, 4000, 4500];

const PAD  = { l: 52, r: 16, t: 16, b: 28 };
const W = 760, H = 220;
const CW   = W - PAD.l - PAD.r;   // 692
const CH   = H - PAD.t - PAD.b;   // 176
const YMIN = 1500, YMAX = 4500;

function toX(i: number)   { return PAD.l + (i / (MONTHS.length - 1)) * CW; }
function toY(v: number)   { return PAD.t + CH - ((v - YMIN) / (YMAX - YMIN)) * CH; }

function smooth(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i][0] - pts[i - 1][0]) * 0.45;
    d += ` C ${pts[i-1][0]+cp} ${pts[i-1][1]} ${pts[i][0]-cp} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}

export function IncomeExpensesChart() {
  const incPts = INCOME.map((v, i)  => [toX(i), toY(v)] as [number, number]);
  const expPts = EXPENSES.map((v, i) => [toX(i), toY(v)] as [number, number]);

  const incLine = smooth(incPts);
  const expLine = smooth(expPts);
  const baseY   = PAD.t + CH;
  const incArea = `${incLine} L ${toX(5)} ${baseY} L ${toX(0)} ${baseY} Z`;
  const expArea = `${expLine} L ${toX(5)} ${baseY} L ${toX(0)} ${baseY} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.75 0.15 145)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="oklch(0.75 0.15 145)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.65 0.18 200)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.65 0.18 200)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {Y_LABELS.map((v) => {
        const y = toY(v);
        const label = v >= 1000 ? `€${(v / 1000).toFixed(1).replace(".0", "")}k` : `€${v}`;
        return (
          <g key={v}>
            <line
              x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="oklch(1 0 0 / 5%)" strokeWidth={1}
            />
            <text
              x={PAD.l - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize={9} fill="oklch(0.50 0.01 80)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={toX(i)} y={H - 6}
          textAnchor="middle" fontSize={9} fill="oklch(0.50 0.01 80)"
        >
          {m}
        </text>
      ))}

      {/* Area fills */}
      <path d={incArea} fill="url(#incGrad)" />
      <path d={expArea} fill="url(#expGrad)" />

      {/* Lines */}
      <path d={incLine} fill="none" stroke="oklch(0.75 0.15 145)" strokeWidth={2}   strokeLinecap="round" strokeLinejoin="round" />
      <path d={expLine} fill="none" stroke="oklch(0.65 0.18 200)" strokeWidth={2}   strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {incPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5}
          fill="oklch(0.75 0.15 145)" stroke="oklch(0.16 0.007 78)" strokeWidth={1.5} />
      ))}
      {expPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5}
          fill="oklch(0.65 0.18 200)" stroke="oklch(0.16 0.007 78)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
