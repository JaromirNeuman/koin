"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const DEFAULT_CURRENCY = "CZK";

export function useProfileCurrency() {
  const supabase = useMemo(() => createClient(), []);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

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

    // Re-fetch when the profile changes elsewhere (e.g. settings save).
    const onChange = () => void loadCurrency();
    window.addEventListener("koin-profile-change", onChange);
    return () => {
      active = false;
      window.removeEventListener("koin-profile-change", onChange);
    };
  }, [supabase]);

  return currency;
}
