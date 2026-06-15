"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KoinLogo } from "@/components/koin-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  usePageTransition,
  TransitionLink,
} from "@/components/layout/page-transition";
import { AuthBackgroundCards } from "@/components/layout/auth-bg-cards";
import { createClient } from "@/lib/supabase/client";

const REQUIREMENTS = [
  {
    id: "length",
    label: "Alespoň 8 znaků",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "Velké písmeno",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "Malé písmeno",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "number", label: "Číslo", test: (p: string) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "Speciální znak (!@#$…)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
] as const;

function getStrength(password: string): number {
  return REQUIREMENTS.filter((r) => r.test(password)).length;
}

const STRENGTH_LABELS = [
  "",
  "Velmi slabé",
  "Slabé",
  "Dobré",
  "Silné",
  "Výborné",
];
const STRENGTH_COLORS = [
  "bg-border",
  "bg-destructive",
  "bg-orange-500",
  "bg-yellow-400",
  "bg-lime-500",
  "bg-emerald-500",
];

export default function RegisterPage() {
  const { navigate } = usePageTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const metRequirements = useMemo(
    () => REQUIREMENTS.map((r) => ({ ...r, met: r.test(password) })),
    [password],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (strength < REQUIREMENTS.length) {
      setError("Heslo nesplňuje všechny požadavky.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // With email confirmation enabled, signUp returns no session — the user
    // must confirm before they can sign in. Show a clear message instead of
    // sending them into a gated onboarding flow.
    if (!data.session) {
      setLoading(false);
      setNotice(
        "Účet byl vytvořen. Potvrďte prosím registraci v e-mailu a poté se přihlaste.",
      );
      return;
    }

    await new Promise((r) => setTimeout(r, 350));
    await navigate("/onboarding");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <AuthBackgroundCards />

      {/* Top-left logo */}
      <header className="absolute left-6 top-6 z-10">
        <KoinLogo size={36} />
      </header>

      {/* Card */}
      <div className="z-10 flex w-full max-w-sm flex-col px-4">
        <Card
          className="w-full gap-0 border-border/60 py-0 shadow-2xl"
          style={{ background: "oklch(0.19 0.008 78)" }}
        >
          <div className="flex flex-col gap-5 p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Vytvořte si účet
              </h1>
              <p className="text-sm text-muted-foreground">
                Začněte sledovat své finance zdarma
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Jméno</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jan Novák"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Heslo</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!passwordTouched) setPasswordTouched(true);
                    }}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {/* Strength meter */}
                <AnimatePresence>
                  {passwordTouched && (
                    <motion.div
                      key="meter"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-2 overflow-hidden"
                    >
                      {/* Bars */}
                      <div className="flex gap-1 pt-1">
                        {REQUIREMENTS.map((_, i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full bg-border overflow-hidden"
                          >
                            <motion.div
                              className={`h-full rounded-full ${i < strength ? STRENGTH_COLORS[strength] : "bg-transparent"}`}
                              initial={{ width: 0 }}
                              animate={{ width: i < strength ? "100%" : "0%" }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Label */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Síla hesla
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={strength}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className={`text-xs font-medium ${
                              strength <= 1
                                ? "text-destructive"
                                : strength === 2
                                  ? "text-orange-500"
                                  : strength === 3
                                    ? "text-yellow-400"
                                    : strength === 4
                                      ? "text-lime-500"
                                      : "text-emerald-500"
                            }`}
                          >
                            {STRENGTH_LABELS[strength]}
                          </motion.span>
                        </AnimatePresence>
                      </div>

                      {/* Requirements list */}
                      <ul className="flex flex-col gap-1">
                        {metRequirements.map((req) => (
                          <motion.li
                            key={req.id}
                            className="flex items-center gap-2"
                            animate={{ opacity: req.met ? 1 : 0.5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span
                              className={`flex size-3.5 items-center justify-center rounded-full transition-colors duration-200 ${req.met ? "bg-emerald-500/20 text-emerald-500" : "bg-border/50 text-muted-foreground"}`}
                            >
                              {req.met ? (
                                <Check className="size-2.5 stroke-[3]" />
                              ) : (
                                <X className="size-2.5 stroke-[2.5]" />
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {req.label}
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    aria-label={showConfirm ? "Skrýt heslo" : "Zobrazit heslo"}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {notice && (
                  <motion.p
                    key="notice"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
                  >
                    {notice}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full" disabled={loading || !!notice}>
                <AnimatePresence mode="wait" initial={false}>
                  {loading ? (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center"
                    >
                      <Loader2 className="size-4 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      Zaregistrovat se
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Již máte účet?{" "}
                <TransitionLink
                  href="/auth/login"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Přihlaste se
                </TransitionLink>
              </p>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
