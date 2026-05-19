"use client";

import { motion } from "framer-motion";

export function AuthBackgroundCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.15 145)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="oklch(0.75 0.15 145)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill – reveals after line draws */}
        <motion.path
          d="M -10,680 C 200,620 380,700 600,630 C 820,560 1020,640 1240,575 C 1340,545 1400,555 1450,540 L 1450,900 L -10,900 Z"
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 10, times: [0, 0.4, 0.75, 1], repeat: Infinity, repeatDelay: 3, delay: 3.5 }}
        />

        {/* Main line */}
        <motion.path
          d="M -10,680 C 200,620 380,700 600,630 C 820,560 1020,640 1240,575 C 1340,545 1400,555 1450,540"
          stroke="oklch(0.75 0.15 145 / 28%)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 10, times: [0, 0.45, 0.75, 1], repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />

        {/* Secondary line – offset timing, blue */}
        <motion.path
          d="M -10,760 C 180,710 400,775 640,720 C 880,665 1080,730 1310,685 C 1390,668 1430,672 1450,660"
          stroke="oklch(0.65 0.18 200 / 18%)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 10, times: [0, 0.45, 0.75, 1], repeat: Infinity, repeatDelay: 3, delay: 5, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}


// ─── Single animated SVG path ─────────────────────────────────────────────────

