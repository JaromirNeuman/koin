"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import { KoinLogo } from "@/components/koin-logo";
import { usePageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/transactions", label: "Transakce",    icon: ArrowLeftRight },
  { href: "/analytics",    label: "Analytika",    icon: BarChart3 },
  { href: "/ai",           label: "AI Přehled",   icon: Sparkles },
  { href: "/settings",     label: "Nastavení",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { navigate } = usePageTransition();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border/50 bg-card/70 px-3 py-5 backdrop-blur">
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
              onClick={() => navigate(href)}
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
          SK
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="truncate text-[13px] font-medium text-foreground">Šimon Krimon</span>
          <button className="mt-1 text-left text-[11px] text-destructive/70 hover:text-destructive">
            Odhlásit
          </button>
        </div>
      </div>
    </aside>
  );
}
