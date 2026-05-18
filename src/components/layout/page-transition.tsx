"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, useAnimation } from "framer-motion";

type TransitionContextType = {
  navigate: (href: string) => Promise<void>;
};

const TransitionContext = createContext<TransitionContextType>({
  navigate: async () => {},
});

export function usePageTransition() {
  return useContext(TransitionContext);
}

const EXPO: [number, number, number, number] = [0.87, 0, 0.13, 1];

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const controls = useAnimation();
  const pendingReveal = useRef(false);

  // Reveal new page when pathname changes
  useEffect(() => {
    if (!pendingReveal.current) return;
    pendingReveal.current = false;
    setTimeout(() => {
      controls.start({
        clipPath: "circle(0% at 50% 50%)",
        transition: { duration: 0.8, ease: EXPO },
      });
    }, 60);
  }, [pathname, controls]);

  // Browser back / forward
  useEffect(() => {
    function onPopState() {
      controls.set({ clipPath: "circle(0% at 50% 50%)" });
      controls.start({
        clipPath: "circle(150% at 50% 50%)",
        transition: { duration: 0.8, ease: EXPO },
      });
      pendingReveal.current = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controls]);

  const navigate = useCallback(
    async (href: string) => {
      controls.set({ clipPath: "circle(0% at 50% 50%)" });
      await controls.start({
        clipPath: "circle(150% at 50% 50%)",
        transition: { duration: 0.8, ease: EXPO },
      });
      pendingReveal.current = true;
      router.push(href);
    },
    [controls, router]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <motion.div
        className="pointer-events-none fixed inset-0 z-[100] bg-background"
        style={{ clipPath: "circle(0% at 50% 50%)" }}
        animate={controls}
      />
      {children}
    </TransitionContext.Provider>
  );
}

export function TransitionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const { navigate } = usePageTransition();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    navigate(href);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
