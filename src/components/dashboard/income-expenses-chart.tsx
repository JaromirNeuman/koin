"use client";

import { motion } from "framer-motion";

type MonthlyData = {
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
};

interface IncomeExpensesChartProps {
  data: MonthlyData[];
}

const PAD = { l: 52, r: 16, t: 16, b: 28 };
const W = 760, H = 220;
const CW = W - PAD.l - PAD.r;   // 692
const CH = H - PAD.t - PAD.b;   // 176

export function IncomeExpensesChart({ data }: IncomeExpensesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center text-[13px] text-muted-foreground">
        Žádná data pro vykreslení grafu
      </div>
    );
  }

  const monthsCount = data.length;

  const allValues = data.flatMap((d) => [d.income, d.expenses]);
  const rawMax = Math.max(...allValues, 1000);
  const rawMin = Math.min(...allValues, 0);

  const YMAX = Math.ceil(rawMax / 1000) * 1000;
  const YMIN = rawMin > 1000 ? Math.floor(rawMin / 1000) * 1000 : 0;

  const Y_LABELS: number[] = [];
  const step = (YMAX - YMIN) / 4;
  for (let i = 0; i <= 4; i++) {
    Y_LABELS.push(YMIN + step * i);
  }

  function toX(i: number) { 
    return PAD.l + (i / (monthsCount - 1 || 1)) * CW; 
  }
  function toY(v: number) { 
    return PAD.t + CH - ((v - YMIN) / (YMAX - YMIN || 1)) * CH; 
  }

  function smooth(pts: [number, number][]): string {
    if (pts.length === 0) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp = (pts[i][0] - pts[i - 1][0]) * 0.45;
      d += ` C ${pts[i - 1][0] + cp} ${pts[i - 1][1]} ${pts[i][0] - cp} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`;
    }
    return d;
  }

  const incPts = data.map((d, i) => [toX(i), toY(d.income)] as [number, number]);
  const expPts = data.map((d, i) => [toX(i), toY(d.expenses)] as [number, number]);

  const incLine = smooth(incPts);
  const expLine = smooth(expPts);
  const baseY = PAD.t + CH;
  
  const lastX = toX(monthsCount - 1);
  const incArea = `${incLine} L ${lastX} ${baseY} L ${toX(0)} ${baseY} Z`;
  const expArea = `${expLine} L ${lastX} ${baseY} L ${toX(0)} ${baseY} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.75 0.15 145)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="oklch(0.75 0.15 145)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.65 0.18 200)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.65 0.18 200)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {Y_LABELS.map((v) => {
        const y = toY(v);
        // Formátování popisků na tisíce (k) pro lepší čitelnost
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

      {/* X labels (Názvy měsíců z databáze) */}
      {data.map((item, i) => (
        <text
          key={`${item.monthLabel}-${i}`}
          x={toX(i)} y={H - 6}
          textAnchor="middle" fontSize={9} fill="oklch(0.50 0.01 80)"
        >
          {item.monthLabel}
        </text>
      ))}

      {/* Area fills */}
      <motion.path
        d={incArea} fill="url(#incGrad)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      />
      <motion.path
        d={expArea} fill="url(#expGrad)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />

      {/* Lines */}
      <motion.path
        d={incLine} fill="none" stroke="oklch(0.75 0.15 145)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={expLine} fill="none" stroke="oklch(0.65 0.18 200)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Dots */}
      {incPts.map(([x, y], i) => (
        <motion.circle key={`inc-${i}`} cx={x} cy={y} r={3.5}
          fill="oklch(0.75 0.15 145)" stroke="var(--card)" strokeWidth={1.5}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.6 + i * 0.07 }}
        />
      ))}
      {expPts.map(([x, y], i) => (
        <motion.circle key={`exp-${i}`} cx={x} cy={y} r={3.5}
          fill="oklch(0.65 0.18 200)" stroke="var(--card)" strokeWidth={1.5}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.7 + i * 0.07 }}
        />
      ))}
    </svg>
  );
}