"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart2,
  Sparkles,
  Settings,
} from "lucide-react";
import { KoinLogo } from "@/components/koin-logo";
import { usePageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/transactions", label: "Transakce",    icon: ArrowLeftRight },
  { href: "/analytics",    label: "Analytika",    icon: BarChart2 },
  { href: "/ai",           label: "AI Přehled",   icon: Sparkles },
  { href: "/settings",     label: "Nastavení",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { navigate } = usePageTransition();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border/40 bg-card px-3 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pb-7">
        <KoinLogo size={30} />
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">Koin</span>
          <span className="text-[10px] text-muted-foreground">personal finance</span>
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
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
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
      <div className="flex items-center gap-2.5 border-t border-border/40 px-2 pt-4">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
          SK
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="truncate text-[13px] font-medium text-foreground">Šimon Krimon</span>
          <button className="mt-0.5 text-left text-[11px] text-destructive/70 hover:text-destructive">
            Odhlásit
          </button>
        </div>
      </div>
    </aside>
  );
}
