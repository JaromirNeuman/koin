"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { KoinLogo } from "@/components/koin-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "../actions";

// ─── Dekorativní pozadí ────────────────────────────────────────────────────

function BarChartDecor() {
  const bars = [180, 115, 200, 135, 160, 95, 170, 125];
  return (
    <svg
      viewBox="0 0 220 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-56 text-foreground opacity-[0.055]"
      aria-hidden
    >
      {bars.map((w, i) => (
        <rect key={i} x="0" y={i * 43} width={w} height="26" rx="4" fill="currentColor" />
      ))}
    </svg>
  );
}

function LineChartDecor() {
  return (
    <svg
      viewBox="0 0 420 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[420px] text-foreground opacity-[0.055]"
      aria-hidden
    >
      <polyline
        points="0,95 55,62 110,100 175,28 235,58 295,18 355,68 420,30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Animační helpers ──────────────────────────────────────────────────────

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: "easeOut" as const, delay },
  };
}

function fadeIn(delay: number) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.9, ease: "easeOut" as const, delay },
  };
}

// ─── Hlavní komponenta ─────────────────────────────────────────────────────

export function LoginView() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  );

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden flex flex-col items-center justify-center px-4 py-16">

      {/* Logo */}
      <div className="absolute top-6 left-6 z-20">
        <KoinLogo size={40} />
      </div>

      {/* Dekorace – bar chart vlevo */}
      <motion.div
        {...fadeIn(0)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 pointer-events-none select-none"
      >
        <BarChartDecor />
      </motion.div>

      {/* Dekorace – velké K vpravo */}
      <motion.div
        {...fadeIn(0.1)}
        className="absolute right-[-110px] top-1/2 -translate-y-1/2 pointer-events-none select-none"
      >
        <KoinLogo size={480} className="opacity-[0.045]" />
      </motion.div>

      {/* Dekorace – velké K vlevo dole */}
      <motion.div
        {...fadeIn(0.15)}
        className="absolute left-[-80px] bottom-[-80px] pointer-events-none select-none"
      >
        <KoinLogo size={340} className="opacity-[0.04]" />
      </motion.div>

      {/* Dekorace – line chart vpravo dole */}
      <motion.div
        {...fadeIn(0.2)}
        className="absolute bottom-12 right-10 pointer-events-none select-none"
      >
        <LineChartDecor />
      </motion.div>

      {/* Obsah */}
      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center gap-8">

        {/* Nadpis */}
        <div className="text-center space-y-3">
          <motion.h1
            {...fadeUp(0.15)}
            className="text-5xl font-bold tracking-tight leading-tight"
          >
            Vítejte zpět
          </motion.h1>
          <motion.p
            {...fadeUp(0.25)}
            className="text-muted-foreground text-[15px] leading-relaxed"
          >
            Váš inteligentní správce financí:
            <br />
            sledujte, předvídejte a šetřete.
          </motion.p>
        </div>

        {/* Formulář */}
        <motion.div
          {...fadeUp(0.35)}
          className="w-full"
        >
          <form
            action={formAction}
            className="bg-card border border-border rounded-2xl p-8 space-y-5 shadow-xl shadow-black/30"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jmeno@example.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl bg-white/[0.06] border-white/10 focus-visible:border-white/25 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Heslo
                </Label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Zapomenuté heslo?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl bg-white/[0.06] border-white/10 focus-visible:border-white/25 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide transition-opacity disabled:opacity-60"
            >
              {isPending ? "Přihlašování…" : "Přihlásit se"}
            </Button>
          </form>
        </motion.div>

        {/* Registrace */}
        <motion.p
          {...fadeUp(0.45)}
          className="text-sm text-muted-foreground"
        >
          Nemáte účet?{" "}
          <Link
            href="/auth/register"
            className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Zaregistrujte se
          </Link>
        </motion.p>
      </div>
    </main>
  );
}
