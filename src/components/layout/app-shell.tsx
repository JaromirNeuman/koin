"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar, NAV } from "@/components/layout/sidebar";
import { KoinLogo } from "@/components/koin-logo";
import { usePageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border/50 bg-card/70 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <KoinLogo size={24} />
            <span className="text-[14px] font-semibold tracking-tight text-foreground">Koin</span>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
            SK
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { navigate } = usePageTransition();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_oklch(0_0_0_/_28%)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);

          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary/45 hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-xl bg-secondary ring-1 ring-border/70"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icon className="relative size-[18px]" />
              <span className="relative max-w-full truncate px-1">
                {label === "AI Přehled" ? "AI" : label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
