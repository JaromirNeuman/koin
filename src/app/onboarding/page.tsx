"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Loader2,
  PartyPopper,
  Tags,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { KoinLogo } from "@/components/koin-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBackgroundCards } from "@/components/layout/auth-bg-cards";
import { usePageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { readProfile, writeProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { code: "CZK", label: "Koruna", symbol: "Kč" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dolar", symbol: "$" },
];

const DEFAULT_CATEGORIES = [
  "Jídlo",
  "Bydlení",
  "Doprava",
  "Zábava",
  "Vzdělávání",
  "Zdraví",
  "Úspory",
  "Předplatné",
];

const STEPS = ["Vítejte", "Měna", "Příjem", "Kategorie"] as const;

export default function OnboardingPage() {
  const { navigate } = usePageTransition();
  const { success } = useToast();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(() => readProfile().name);
  const [currency, setCurrency] = useState(() => readProfile().currency || "CZK");
  const [income, setIncome] = useState("");
  const [categories, setCategories] = useState<string[]>([
    "Jídlo",
    "Bydlení",
    "Doprava",
    "Úspory",
  ]);

  // If onboarding is already done, skip straight to the app.
  useEffect(() => {
    if (readProfile().completedAt) {
      void navigate("/dashboard");
    }
  }, [navigate]);

  // Prefill name from the freshly-registered account if we don't have one yet.
  useEffect(() => {
    if (readProfile().name) return;
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const fullName = user?.user_metadata?.full_name;
        if (active && typeof fullName === "string") setName(fullName);
      } catch {
        /* offline / no session — fine, user can type a name */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isLast = step === STEPS.length - 1;
  const canContinue = step === 0 ? name.trim().length > 0 : true;

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function toggleCategory(cat: string) {
    setCategories((cur) =>
      cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]
    );
  }

  async function finish() {
    setSaving(true);

    // Best-effort backend persistence: profile fields + seed the chosen categories.
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ currency, full_name: name.trim() })
          .eq("id", user.id);

        if (categories.length > 0) {
          const { data: existing } = await supabase
            .from("categories")
            .select("name")
            .eq("user_id", user.id);
          const have = new Set((existing ?? []).map((c: { name: string }) => c.name));
          const toInsert = categories
            .filter((c) => !have.has(c))
            .map((name) => ({ name, user_id: user.id }));
          if (toInsert.length > 0) {
            await supabase.from("categories").insert(toInsert);
          }
        }
      }
    } catch {
      /* swallow — we still keep a local copy below */
    }

    writeProfile({
      name: name.trim(),
      currency,
      monthlyIncome: income ? Number(income) : null,
      categories,
      completedAt: new Date().toISOString(),
    });

    success("Vše je připraveno!", "Váš účet je nastavený.");
    await navigate("/dashboard");
  }

  async function skip() {
    writeProfile({ completedAt: new Date().toISOString() });
    await navigate("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <AuthBackgroundCards />

      <header className="absolute left-6 top-6 z-10">
        <KoinLogo size={36} />
      </header>
      <button
        onClick={skip}
        className="absolute right-6 top-6 z-10 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Přeskočit
      </button>

      <div className="z-10 flex w-full max-w-md flex-col gap-5">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] transition-colors",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <Card
          className="w-full gap-0 overflow-hidden border-border/60 py-0 shadow-2xl"
          style={{ background: "oklch(0.19 0.008 78)" }}
        >
          <div className="relative min-h-[360px] p-8">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -36 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-5"
              >
                {step === 0 && (
                  <StepShell
                    icon={<PartyPopper className="size-5" />}
                    title="Vítejte v Koin"
                    description="Pojďme si rychle nastavit účet. Zabere to méně než minutu."
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-name">Jak vám máme říkat?</Label>
                      <Input
                        id="ob-name"
                        autoFocus
                        placeholder="Jan Novák"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </StepShell>
                )}

                {step === 1 && (
                  <StepShell
                    icon={<Coins className="size-5" />}
                    title="Vyberte hlavní měnu"
                    description="V této měně budeme zobrazovat zůstatky a transakce."
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setCurrency(c.code)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-colors",
                            currency === c.code
                              ? "border-emerald-500/60 bg-emerald-500/10"
                              : "border-border/70 bg-secondary/30 hover:border-foreground/25"
                          )}
                        >
                          <span className="text-lg font-bold text-foreground">{c.symbol}</span>
                          <span className="text-[12px] font-medium text-foreground">{c.code}</span>
                          <span className="text-[11px] text-muted-foreground">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </StepShell>
                )}

                {step === 2 && (
                  <StepShell
                    icon={<Wallet className="size-5" />}
                    title="Měsíční příjem"
                    description="Pomůže nám navrhnout rozpočet. Můžete přeskočit a doplnit později."
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-income">Čistý měsíční příjem (volitelné)</Label>
                      <div className="relative">
                        <Input
                          id="ob-income"
                          type="number"
                          inputMode="decimal"
                          placeholder="40000"
                          value={income}
                          onChange={(e) => setIncome(e.target.value)}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                          {CURRENCIES.find((c) => c.code === currency)?.symbol}
                        </span>
                      </div>
                    </div>
                  </StepShell>
                )}

                {step === 3 && (
                  <StepShell
                    icon={<Tags className="size-5" />}
                    title="Vyberte kategorie"
                    description="Začneme s těmito. Kategorie můžete kdykoliv upravit."
                  >
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_CATEGORIES.map((cat) => {
                        const selected = categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                              selected
                                ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                                : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {selected && <Check className="size-3.5 text-emerald-400" />}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </StepShell>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-border/60 px-8 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go(step - 1)}
              disabled={step === 0 || saving}
              className={cn(step === 0 && "invisible")}
            >
              <ArrowLeft className="size-3.5" />
              Zpět
            </Button>

            {isLast ? (
              <Button size="sm" onClick={finish} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Dokončit
              </Button>
            ) : (
              <Button size="sm" onClick={() => go(step + 1)} disabled={!canContinue}>
                Pokračovat
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </>
  );
}
