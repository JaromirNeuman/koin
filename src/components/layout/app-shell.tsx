"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { KoinLogo } from "@/components/koin-logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="sm:hidden">
            <motion.div
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border/50 bg-card/70 px-4 py-3 backdrop-blur sm:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Otevřít menu"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <KoinLogo size={24} />
            <span className="text-[14px] font-semibold tracking-tight text-foreground">Koin</span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
