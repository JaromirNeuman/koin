"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastOptions {
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (title: string, opts?: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  default: "text-indigo-400",
  success: "text-emerald-400",
  error: "text-red-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (title: string, opts?: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((current) => [
        ...current,
        { id, title, description: opts?.description, variant: opts?.variant ?? "default" },
      ]);
      window.setTimeout(() => remove(id), 3800);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast: push,
    success: (title, description) => push(title, { description, variant: "success" }),
    error: (title, description) => push(title, { description, variant: "error" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] ring-1 ring-foreground/[0.06]"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", ICON_COLOR[t.variant])} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Zavřít upozornění"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
