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

// Slide-up ease: fast entry, smooth exit
const EASE_IN: [number, number, number, number] = [0.32, 0, 0.67, 0];
const EASE_OUT: [number, number, number, number] = [0.33, 1, 0.68, 1];

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const controls = useAnimation();
  const pendingReveal = useRef(false);

  // Reveal new page: curtain sweeps up off screen
  useEffect(() => {
    if (!pendingReveal.current) return;
    pendingReveal.current = false;
    setTimeout(() => {
      controls.start({
        y: "-100%",
        borderRadius: "0px 0px 0px 0px",
        transition: { duration: 0.55, ease: EASE_OUT },
      });
    }, 60);
  }, [pathname, controls]);

  // Browser back / forward
  useEffect(() => {
    function onPopState() {
      controls.set({ y: "100%", borderRadius: "24px 24px 0px 0px" });
      controls.start({
        y: "0%",
        borderRadius: "0px 0px 0px 0px",
        transition: { duration: 0.45, ease: EASE_IN },
      });
      pendingReveal.current = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controls]);

  const navigate = useCallback(
    async (href: string) => {
      // Start below screen with rounded top corners (modal feel)
      controls.set({ y: "100%", borderRadius: "24px 24px 0px 0px" });
      // Slide up to cover screen, flatten corners as it fills
      await controls.start({
        y: "0%",
        borderRadius: "0px 0px 0px 0px",
        transition: { duration: 0.45, ease: EASE_IN },
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
        style={{ y: "100%", borderRadius: "24px 24px 0px 0px" }}
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
