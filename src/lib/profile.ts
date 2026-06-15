"use client";

import { useEffect, useState } from "react";

export interface KoinProfile {
  name: string;
  currency: string;
  monthlyIncome: number | null;
  categories: string[];
  completedAt: string | null;
}

const KEY = "koin-onboarding";
const EVENT = "koin-profile-change";

export const DEFAULT_PROFILE: KoinProfile = {
  name: "",
  currency: "CZK",
  monthlyIncome: null,
  categories: [],
  completedAt: null,
};

export function readProfile(): KoinProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<KoinProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeProfile(patch: Partial<KoinProfile>): KoinProfile {
  const next = { ...readProfile(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage disabled — non-fatal */
  }
  return next;
}

/** Reactive read of the local profile. Updates when written from anywhere. */
export function useProfile(): KoinProfile {
  const [profile, setProfile] = useState<KoinProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const sync = () => setProfile(readProfile());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return profile;
}
