"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Bydlení",  pct: 0.38, color: "oklch(0.68 0.2  300)" },
  { label: "Jídlo",    pct: 0.22, color: "oklch(0.60 0.22 270)" },
  { label: "Doprava",  pct: 0.14, color: "oklch(0.52 0.2  255)" },
  { label: "Zábava",   pct: 0.12, color: "oklch(0.45 0.18 245)" },
  { label: "Ostatní",  pct: 0.14, color: "oklch(0.32 0.06 255)" },
];

const SEGMENTS = CATEGORIES.reduce<
  Array<(typeof CATEGORIES)[number] & { start: number }>
>((segments, category) => {
  const start = segments.reduce((sum, segment) => sum + segment.pct, 0);
  return [...segments, { ...category, start }];
}, []);

export function CategoryDonut() {
  const [active, setActive] = useState<number | null>(null);
  const r    = 58;
  const cx   = 75;
  const cy   = 75;
  const circ = 2 * Math.PI * r;

  const activeCat = active !== null ? CATEGORIES[active] : null;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={150} height={150} viewBox="0 0 150 150" aria-hidden="true">
          {SEGMENTS.map(({ label, pct, color, start }, i) => {
            const dim = active !== null && active !== i;
            return (
              <motion.circle
                key={label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeLinecap="butt"
                transform={`rotate(${-90 + start * 360} ${cx} ${cy})`}
                initial={{ strokeDasharray: `0 ${circ}`, opacity: 0 }}
                animate={{
                  strokeDasharray: `${pct * circ} ${circ}`,
                  strokeWidth: active === i ? 26 : 20,
                  opacity: dim ? 0.3 : 1,
                }}
                transition={{
                  strokeDasharray: { duration: 0.9, delay: 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.35, delay: 0.15 + i * 0.09 },
                  strokeWidth: { type: "spring", stiffness: 400, damping: 26 },
                  default: { duration: 0.25 },
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
          {/* Donut hole */}
          <circle cx={cx} cy={cy} r={38} fill="var(--card)" />
        </svg>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={activeCat?.label ?? "total"}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              className="text-lg font-bold tabular-nums text-foreground"
            >
              {Math.round((activeCat?.pct ?? 1) * 100)}%
            </motion.span>
          </AnimatePresence>
          <span className="text-[10px] text-muted-foreground">
            {activeCat?.label ?? "celkem"}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {CATEGORIES.map(({ label, pct, color }, i) => (
          <li
            key={label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors",
              active === i && "bg-secondary/60"
            )}
          >
            <motion.span
              className="size-2 shrink-0 rounded-full"
              style={{ background: color }}
              animate={{ scale: active === i ? 1.5 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
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
