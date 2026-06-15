"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readProfile } from "@/lib/profile";

export const DEFAULT_CURRENCY = "CZK";

export function useProfileCurrency() {
  const supabase = useMemo(() => createClient(), []);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  // Local profile (onboarding / settings) is the immediate source of truth.
  useEffect(() => {
    const sync = () => setCurrency(readProfile().currency || DEFAULT_CURRENCY);
    sync();
    window.addEventListener("koin-profile-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("koin-profile-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // If a backend profile exists, let it override.
  useEffect(() => {
    let active = true;

    async function loadCurrency() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      if (active && data?.currency) {
        setCurrency(String(data.currency).toUpperCase());
      }
    }

    void loadCurrency();

    return () => {
      active = false;
    };
  }, [supabase]);

  return currency;
}
