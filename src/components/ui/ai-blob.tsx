"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Koin AI's living avatar — a floating, morphing 3D gradient blob.
 * Replaces the static bot icon.
 */
export function AiBlob({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gradient =
    "conic-gradient(from 0deg, oklch(0.82 0.16 160), oklch(0.74 0.16 210), oklch(0.70 0.21 300), oklch(0.80 0.18 140), oklch(0.82 0.16 160))";

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* soft glow behind */}
      <motion.span
        className="absolute inset-[-15%] opacity-70 blur-[7px]"
        style={{ background: gradient, borderRadius: "50%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />

      {/* morphing blob body */}
      <motion.span
        className="absolute inset-0 overflow-hidden shadow-[inset_0_-2px_4px_rgba(0,0,0,0.25)]"
        style={{ background: gradient }}
        animate={{
          borderRadius: [
            "60% 40% 35% 65% / 60% 35% 65% 40%",
            "35% 65% 60% 40% / 50% 60% 40% 55%",
            "55% 45% 50% 50% / 45% 55% 45% 60%",
            "60% 40% 35% 65% / 60% 35% 65% 40%",
          ],
          rotate: [0, -360],
          y: [0, -1.5, 0, 1.5, 0],
        }}
        transition={{
          borderRadius: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 14, repeat: Infinity, ease: "linear" },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {/* specular highlight for the 3D look */}
        <span
          className="absolute rounded-full bg-white/60 blur-[2px]"
          style={{ left: "16%", top: "12%", width: "38%", height: "38%" }}
        />
        {/* subtle secondary sheen */}
        <span
          className="absolute rounded-full bg-white/20 blur-[1px]"
          style={{ right: "18%", bottom: "16%", width: "22%", height: "22%" }}
        />
      </motion.span>
    </span>
  );
}
