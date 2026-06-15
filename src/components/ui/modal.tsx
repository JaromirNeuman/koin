"use client";

import type React from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            className="absolute inset-0"
            aria-label="Zavřít dialog"
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "relative w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl",
              className
            )}
            initial={{ y: 18, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="text-base font-semibold text-foreground">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Zavřít">
                <X className="size-4" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
