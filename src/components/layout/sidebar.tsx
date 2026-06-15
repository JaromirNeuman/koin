"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";
import { KoinLogo } from "@/components/koin-logo";
import { usePageTransition } from "@/components/layout/page-transition";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/transactions", label: "Transakce",    icon: ArrowLeftRight },
  { href: "/analytics",    label: "Analytika",    icon: BarChart3 },
  { href: "/ai",           label: "AI Přehled",   icon: Sparkles },
  { href: "/settings",     label: "Nastavení",    icon: Settings },
];

export { NAV };

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { navigate } = usePageTransition();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile({
          id: data.id,
          email: user.email || "",
          full_name: data.full_name,
          avatar_url: data.avatar_url || null,
          currency: data.currency || "CZK",
          created_at: data.created_at,
        });
      }
    }
    loadUserData();

    const onChange = () => loadUserData();
    window.addEventListener("koin-profile-change", onChange);
    return () => window.removeEventListener("koin-profile-change", onChange);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/auth/login");
  }

  function go(href: string) {
    navigate(href);
    onNavigate?.();
  }

  const displayName = profile?.full_name || "Uživatel";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/50 bg-card/70 px-3 py-5 backdrop-blur">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pb-8">
        <KoinLogo size={30} />
        <div className="flex flex-col leading-none">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Koin</span>
          <span className="mt-1 text-[10px] text-muted-foreground">personal finance</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => go(href)}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-foreground ring-1 ring-border/70"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-[15px] shrink-0",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-2 pt-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
          {toInitials(displayName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="truncate text-[13px] font-medium text-foreground">{displayName}</span>
          <button
            onClick={handleLogout}
            className="mt-1 flex items-center gap-1 text-left text-[11px] text-destructive/70 transition-colors hover:text-destructive"
          >
            <LogOut className="size-3" />
            Odhlásit
          </button>
        </div>
      </div>
    </aside>
  );
}
