"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const { navigate } = usePageTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Small delay so spinner is visible before curtain drops
    await new Promise((r) => setTimeout(r, 350));
    await navigate("/dashboard");
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      <AuthBackgroundCards />

      {/* Top-left logo */}
      <header className="absolute left-6 top-6 z-10">
        <KoinLogo size={36} />
      </header>

      {/* Card */}
      <div className="z-10 flex w-full max-w-sm flex-col px-4">
        <Card className="w-full gap-0 border-border/60 py-0 shadow-2xl" style={{ background: 'oklch(0.19 0.008 78)' }}>
          <div className="flex flex-col gap-5 p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Vítejte zpět v Koin
              </h1>
              <p className="text-sm text-muted-foreground">
                Přihlaste se svým e-mailem
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
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
                      Přihlásit se
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Nemáte účet?{" "}
                <TransitionLink
                  href="/auth/register"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Zaregistrujte se
                </TransitionLink>
              </p>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
