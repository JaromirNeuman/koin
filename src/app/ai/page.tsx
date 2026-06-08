"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarClock,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  TrendingUp,
  User,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Message = {
  role: "assistant" | "user";
  content: string;
};

// Renders assistant text word-by-word; only newly-arrived words fade in.
function AssistantText({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(5px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline"
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}

const STARTER_MESSAGES: Message[] = [
  {
    role: "assistant",
    content:
      "Ahoj, jsem Koin AI. Vidím vyšší výdaje za jídlo a předplatné. Můžu navrhnout rozpočet, najít úniky nebo shrnout tento měsíc.",
  },
];

const PROMPTS = [
  { label: "Shrň únor", icon: Sparkles },
  { label: "Kde ušetřím?", icon: Lightbulb },
  { label: "Naplánuj rozpočet", icon: WalletCards },
  { label: "Předpověď zůstatku", icon: TrendingUp },
];

function makeReply(prompt: string) {
  const lower = prompt.toLowerCase();

  if (lower.includes("ušet") || lower.includes("šet")) {
    return "Nejrychlejší úspora je snížit zábavu o €45 a jídlo mimo domov o €60. Zachováte tím tempo úspor kolem €2 050 za měsíc bez zásahu do nájmu nebo dopravy.";
  }

  if (lower.includes("rozpo")) {
    return "Doporučený rozpočet: bydlení €850, jídlo €360, doprava €180, zábava €140, rezerva €250. Při příjmu €4 300 by zůstalo přibližně €2 520 na úspory a cíle.";
  }

  if (lower.includes("zůstat") || lower.includes("pred") || lower.includes("před")) {
    return "Při současném tempu bude odhadovaný zůstatek na konci března €6 120. Největší riziko jsou nepravidelné výdaje za auto, které v lednu zvedly výdaje o €420.";
  }

  return "Únor vypadá zdravě: příjem €4 300, výdaje €2 340 a úspora €1 960. Oproti lednu jsou výdaje nižší o 8,2 %, hlavně díky menším jednorázovým platbám.";
}

export default function AiPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const busy = thinking || streaming;

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(timeout);
  }, []);

  // Clear any pending timers on unmount
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  // Auto-scroll as the conversation grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const latestInsight = useMemo(
    () => [
      { label: "Úspory tento měsíc", value: "€1 960" },
      { label: "Největší výdaj", value: "Nájem" },
      { label: "Riziko rozpočtu", value: "Auto" },
    ],
    []
  );

  function appendToLast(chunk: string) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      next[next.length - 1] = { role: "assistant", content: last.content + chunk };
      return next;
    });
  }

  // Demo stream used when no OpenAI key is configured (HTTP 503).
  function simulateReply(prompt: string) {
    setThinking(false);
    setStreaming(true);
    setMessages((current) => [...current, { role: "assistant", content: "" }]);

    const words = makeReply(prompt).split(" ");
    let i = 0;

    const tick = () => {
      appendToLast((i === 0 ? "" : " ") + words[i]);
      i += 1;
      if (i < words.length) {
        timers.current.push(window.setTimeout(tick, 55 + Math.random() * 45));
      } else {
        setStreaming(false);
      }
    };

    timers.current.push(window.setTimeout(tick, 60));
  }

  async function runAssistant(history: Message[], prompt: string) {
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      // No key (503) or any error → graceful demo fallback.
      if (!res.ok || !res.body) {
        simulateReply(prompt);
        return;
      }

      setThinking(false);
      setStreaming(true);
      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) appendToLast(chunk);
      }

      setStreaming(false);
    } catch {
      simulateReply(prompt);
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    void runAssistant(history, trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-7xl flex-col gap-6 px-6 py-7 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Přehled</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Osobní finanční asistent nad vašimi transakcemi
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
            busy
              ? "border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          )}
        >
          <span className="relative flex size-1.5">
            <motion.span
              className={cn(
                "absolute inline-flex size-full rounded-full",
                busy ? "bg-indigo-300" : "bg-emerald-300"
              )}
              animate={{ opacity: [0.4, 1, 0.4], scale: busy ? [1, 1.6, 1] : 1 }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                busy ? "bg-indigo-300" : "bg-emerald-300"
              )}
            />
          </span>
          {busy ? "Píše…" : "Připraveno"}
        </div>
      </header>

      {loading ? (
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_340px]">
          <Card className="gap-4 px-5 py-5">
            <Skeleton className="h-5 w-36" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-4/5 rounded-xl" />
              <Skeleton className="ml-auto h-14 w-3/5 rounded-xl" />
              <Skeleton className="h-20 w-5/6 rounded-xl" />
            </div>
            <div className="mt-auto space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      ) : (
      <RevealGroup className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_340px]">
        <RevealItem className="min-h-0">
        <Card className="h-full min-h-0 gap-0 overflow-hidden ring-1 ring-foreground/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold leading-tight text-foreground">Koin AI</h2>
                <p className="text-[11px] text-muted-foreground">
                  {busy ? "přemýšlí…" : "online · odpoví okamžitě"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
              {messages.map((message, index) => {
                const assistant = message.role === "assistant";
                const Icon = assistant ? Bot : User;
                const isLast = index === messages.length - 1;
                const showCaret = assistant && isLast && streaming;

                return (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 460, damping: 32 }}
                    className={cn("flex gap-3", assistant ? "justify-start" : "justify-end")}
                  >
                    {assistant && (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-5 shadow-sm",
                        assistant
                          ? "rounded-tl-sm border border-border/70 bg-secondary/40 text-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      )}
                    >
                      {assistant ? <AssistantText text={message.content} /> : message.content}
                      {showCaret && (
                        <motion.span
                          aria-hidden
                          className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-current align-middle"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity }}
                        />
                      )}
                    </div>
                    {!assistant && (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                        <Icon className="size-4" />
                      </span>
                    )}
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {thinking && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex gap-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="size-4" />
                    </span>
                    <div className="flex items-center rounded-2xl rounded-tl-sm border border-border/70 bg-secondary/40 px-4 py-3">
                      <span className="text-shimmer text-[13px] font-medium">přemýšlí…</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border/60 px-5 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {PROMPTS.map(({ label, icon: Icon }) => (
                  <motion.button
                    key={label}
                    onClick={() => sendMessage(label)}
                    disabled={busy}
                    whileTap={{ scale: 0.94 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/35 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </motion.button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  className="h-10"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Zeptejte se na rozpočet, výdaje nebo úspory..."
                  disabled={busy}
                />
                <Button
                  className="h-10 w-11"
                  aria-label="Odeslat zprávu"
                  disabled={busy || !input.trim()}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </Card>
        </RevealItem>

        <div className="flex flex-col gap-5">
          <RevealItem>
          <Card className="px-5 py-5 ring-1 ring-foreground/[0.08]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-[15px] font-semibold text-foreground">Rychlé insighty</h2>
            </div>
            <div className="grid gap-3">
              {latestInsight.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-3 transition-colors hover:border-foreground/15 hover:bg-secondary/50"
                >
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </Card>
          </RevealItem>

          <RevealItem>
          <Card className="px-5 py-5 ring-1 ring-foreground/[0.08]">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              <h2 className="text-[15px] font-semibold text-foreground">Doporučení týdne</h2>
            </div>
            <p className="text-[13px] leading-5 text-muted-foreground">
              Nastavte limit €95 pro zábavu do konce týdne. Podle trendu vám to udrží měsíční úsporu nad 45 % příjmů.
            </p>
          </Card>
          </RevealItem>
        </div>
      </RevealGroup>
      )}
    </div>
  );
}
