"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { AiBlob } from "@/components/ui/ai-blob";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/money";
import { useProfileCurrency } from "@/lib/use-profile-currency";
import { cn } from "@/lib/utils";
import { catName, suggestFollowUps } from "./ai-utils";

type Message = {
  role: "assistant" | "user";
  content: string;
};

type FinanceSummary = {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  biggest?: { name: string; amount: number };
  byCategory: { name: string; amount: number }[];
  monthLabel: string;
  hasData: boolean;
};

// ─── Minimal markdown rendering (bold / italic / code / lists) ───────────────────
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      nodes.push(
        <strong
          key={`${keyPrefix}-${key++}`}
          className="font-semibold text-foreground"
        >
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-${key++}`}
          className="rounded bg-background/60 px-1 py-0.5 text-[12px] font-mono text-foreground"
        >
          {match[3]}
        </code>,
      );
    } else if (match[4] !== undefined || match[5] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{match[4] ?? match[5]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else if (ordered) {
      if (last?.type === "ol") last.items.push(ordered[1]);
      else blocks.push({ type: "ol", items: [ordered[1]] });
    } else {
      blocks.push({ type: "p", text: line.trim() });
    }
  }
  return blocks;
}

function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul
              key={i}
              className="list-disc space-y-1 pl-4 marker:text-muted-foreground"
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol
              key={i}
              className="list-decimal space-y-1 pl-4 marker:text-muted-foreground"
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(block.text, `${i}`)}</p>;
      })}
    </div>
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

  if (lower.includes("ušet") || lower.includes("šet") || lower.includes("limit")) {
    return [
      "Podle tvých dat jsou tři rychlé úspory:",
      "",
      "- **Zábava**: strop **2 400 Kč/měsíc** (teď ~3 500) → ušetříš **1 100 Kč**",
      "- **Jídlo mimo domov**: omez na 2× týdně → **1 500 Kč**",
      "- **Předplatné**: zruš nevyužité → **330 Kč**",
      "",
      "Tím udržíš tempo úspor kolem **51 250 Kč/měsíc** bez zásahu do nájmu nebo dopravy.",
    ].join("\n");
  }

  if (lower.includes("rozpo")) {
    return [
      "Navrhuji rozpočet podle pravidla **50/30/20** pro tvůj příjem **107 500 Kč**:",
      "",
      "1. **Potřeby** (~53 750 Kč): bydlení 21 250, jídlo 9 000, doprava 4 500, energie 5 000",
      "2. **Přání** (~32 250 Kč): zábava 3 500, nákupy 3 750, ostatní",
      "3. **Úspory** (~21 500 Kč): rezerva a cíle",
      "",
      "Při disciplíně ti zůstane přes **63 000 Kč** na úspory a cíle.",
    ].join("\n");
  }

  if (
    lower.includes("zůstat") ||
    lower.includes("pred") ||
    lower.includes("před") ||
    lower.includes("březn")
  ) {
    return [
      "Předpověď na konec **března**:",
      "",
      "- Odhadovaný zůstatek: **153 000 Kč**",
      "- Tempo úspor: **+49 000 Kč/měsíc**",
      "- ⚠️ Riziko: nepravidelné výdaje za **auto** (v lednu +10 500 Kč)",
      "",
      "Doporučuji založit rezervu **2 500 Kč/měsíc** právě na auto.",
    ].join("\n");
  }

  if (lower.includes("kategor") || lower.includes("utrác") || lower.includes("výdaj")) {
    return [
      "Tvoje největší výdajové kategorie tento měsíc:",
      "",
      "1. **Bydlení** — 21 250 Kč (38 %)",
      "2. **Auto** — 10 500 Kč (19 %)",
      "3. **Jídlo** — 7 750 Kč (14 %)",
      "4. **Zábava** — 4 750 Kč (9 %)",
      "",
      "Největší prostor ke zlepšení je u **auta** a **jídla**.",
    ].join("\n");
  }

  return [
    "Únor vypadá zdravě 👍",
    "",
    "- Příjem: **107 500 Kč**",
    "- Výdaje: **58 500 Kč**",
    "- Úspora: **49 000 Kč** (45,6 % příjmu)",
    "",
    "Oproti lednu jsou výdaje nižší o **8,2 %**. Chceš shrnout kategorie nebo navrhnout rozpočet?",
  ].join("\n");
}

export default function AiPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const currency = useProfileCurrency();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const busy = thinking || streaming;
  const lastMessage = messages[messages.length - 1];

  // Load this month's real financial summary from Supabase.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const pad = (n: number) => String(n).padStart(2, "0");
        const start = `${y}-${pad(m + 1)}-01`;
        const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
        const monthLabel = now.toLocaleString("cs-CZ", { month: "long" });

        let income = 0;
        let expenses = 0;
        const cat: Record<string, number> = {};

        if (user) {
          const { data } = await supabase
            .from("transactions")
            .select("amount, transaction_type, categories ( name )")
            .eq("user_id", user.id)
            .gte("date", start)
            .lte("date", end);
          for (const t of data ?? []) {
            const amt = Math.abs(t.amount);
            if (t.transaction_type === "income") income += amt;
            else {
              expenses += amt;
              const n = catName(t.categories);
              cat[n] = (cat[n] ?? 0) + amt;
            }
          }
        }

        const byCategory = Object.entries(cat)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount);
        const savings = income - expenses;

        if (active) {
          setSummary({
            income,
            expenses,
            savings,
            savingsRate: income > 0 ? (savings / income) * 100 : 0,
            biggest: byCategory[0],
            byCategory,
            monthLabel,
            hasData: income > 0 || expenses > 0,
          });
        }
      } catch {
        /* signed-out / offline — leave summary null */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
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

  const latestInsight = useMemo(() => {
    if (!summary || !summary.hasData) return [];
    return [
      { label: "Úspory tento měsíc", value: formatMoney(summary.savings, currency) },
      { label: "Míra úspor", value: `${summary.savingsRate.toFixed(1)} %` },
      { label: "Největší výdaj", value: summary.biggest?.name ?? "—" },
      { label: "Příjmy", value: formatMoney(summary.income, currency) },
    ];
  }, [summary, currency]);

  const recommendation = useMemo(() => {
    if (!summary || !summary.hasData)
      return "Přidejte první transakce a já navrhnu, kde můžete ušetřit.";
    const rate = summary.savingsRate.toFixed(0);
    if (summary.biggest && summary.savingsRate < 20)
      return `Vaše míra úspor je ${rate} %. Zvažte měsíční limit na „${summary.biggest.name}" (${formatMoney(summary.biggest.amount, currency)}) a cílte na 20 %.`;
    if (summary.biggest)
      return `Skvělá práce — míra úspor ${rate} %. Největší výdaj je „${summary.biggest.name}" (${formatMoney(summary.biggest.amount, currency)}); hlídejte si ho.`;
    return `Míra úspor ${rate} %. Pokračujte v tomto tempu.`;
  }, [summary, currency]);

  function buildContext(): string | undefined {
    if (!summary || !summary.hasData) return undefined;
    return [
      `Měsíc: ${summary.monthLabel}`,
      `Příjmy: ${formatMoney(summary.income, currency)}`,
      `Výdaje: ${formatMoney(summary.expenses, currency)}`,
      `Úspory: ${formatMoney(summary.savings, currency)} (${summary.savingsRate.toFixed(1)} %)`,
      `Výdaje dle kategorií: ${
        summary.byCategory
          .slice(0, 6)
          .map((c) => `${c.name} ${formatMoney(c.amount, currency)}`)
          .join(", ") || "žádné"
      }`,
    ].join("\n");
  }

  function appendToLast(chunk: string) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      next[next.length - 1] = {
        role: "assistant",
        content: last.content + chunk,
      };
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
        body: JSON.stringify({ messages: history, context: buildContext() }),
      });

      // No key (503) or any error → graceful demo fallback.
      if (!res.ok || !res.body) {
        simulateReply(prompt);
        return;
      }

      setThinking(false);
      setStreaming(true);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) appendToLast(chunk);
        }
        setStreaming(false);
      } catch {
        // Stream interrupted mid-way — remove the orphan empty message and fall
        // back to demo mode so the user always gets a response.
        setMessages((current) => {
          const next = [...current];
          if (next[next.length - 1]?.content === "") next.pop();
          return next;
        });
        setStreaming(false);
        simulateReply(prompt);
      }
    } catch {
      simulateReply(prompt);
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(history);
    setInput("");
    void runAssistant(history, trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const showHero = messages.length <= 1 && !thinking && !streaming;

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-emerald-500/[0.07] blur-[100px]"
      />
      <PageHeader
        title="AI Přehled"
        subtitle="Tvůj finanční parťák"
      />

      {loading ? (
        <div className="grid min-h-[520px] flex-1 gap-5 xl:grid-cols-[1fr_340px]">
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
        <RevealGroup className="grid min-h-[520px] flex-1 gap-5 xl:grid-cols-[1fr_340px]">
          <RevealItem className="min-h-0">
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-card/80 to-card/40 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              {/* ambient glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 h-44 w-2/3 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
              />

              {/* header */}
              <div className="relative flex items-center gap-3 px-5 py-4">
                <AiBlob size={36} />
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold leading-tight text-foreground">
                    Koin AI
                  </h2>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        busy ? "bg-indigo-400" : "bg-emerald-400",
                      )}
                    />
                    {busy ? "přemýšlí…" : "online"}
                  </p>
                </div>
              </div>

              {/* conversation */}
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-auto px-4 py-2 sm:px-6">
                  {showHero ? (
                    <div className="flex h-full flex-col items-center justify-center gap-6 py-6 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 18 }}
                      >
                        <AiBlob size={88} />
                      </motion.div>
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                          Ahoj 👋 Jak ti pomůžu s penězi?
                        </h3>
                        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                          {recommendation}
                        </p>
                      </div>
                      <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                        {PROMPTS.map(({ label, icon: Icon }, i) => (
                          <motion.button
                            key={label}
                            onClick={() => sendMessage(label)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-secondary/30 px-3.5 py-3 text-left text-[13px] text-foreground transition-colors hover:border-emerald-400/30 hover:bg-secondary/60"
                          >
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/12 text-emerald-400 transition-transform group-hover:scale-110">
                              <Icon className="size-3.5" />
                            </span>
                            {label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const assistant = message.role === "assistant";
                      return (
                        <motion.div
                          key={index}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 460, damping: 34 }}
                          className={cn(
                            "flex items-end gap-2.5",
                            assistant ? "justify-start" : "justify-end",
                          )}
                        >
                          {assistant && <AiBlob size={26} className="mb-0.5" />}
                          <div
                            className={cn(
                              "max-w-[82%] px-4 py-2.5 text-[13.5px] leading-relaxed",
                              assistant
                                ? "rounded-2xl rounded-bl-md bg-secondary/55 text-foreground ring-1 ring-white/[0.04]"
                                : "rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md",
                            )}
                          >
                            {assistant ? (
                              <Markdown content={message.content} />
                            ) : (
                              message.content
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  <AnimatePresence>
                    {thinking && (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-end gap-2.5"
                      >
                        <AiBlob size={26} className="mb-0.5" />
                        <div className="rounded-2xl rounded-bl-md bg-secondary/55 px-4 py-3 ring-1 ring-white/[0.04]">
                          <span className="text-shimmer text-[13px] font-medium">
                            přemýšlí…
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Follow-up suggestions after the latest assistant reply */}
                  <AnimatePresence>
                    {!busy &&
                      messages.length > 1 &&
                      lastMessage?.role === "assistant" && (
                        <motion.div
                          key="followups"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.25 }}
                          className="flex flex-wrap gap-2 pl-[34px]"
                        >
                          {suggestFollowUps(lastMessage.content).map((s, i) => (
                            <motion.button
                              key={s}
                              onClick={() => sendMessage(s)}
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.94 }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-1.5 text-[12px] text-foreground/80 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-foreground"
                            >
                              <Sparkles className="size-3 text-emerald-400" />
                              {s}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                  </AnimatePresence>

                  <div ref={bottomRef} />
                </div>

                {/* input */}
                <div className="relative px-4 pb-4 pt-2 sm:px-6">
                  <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-secondary/40 py-1.5 pl-4 pr-1.5 shadow-lg transition-colors focus-within:border-emerald-400/40 focus-within:bg-secondary/60"
                  >
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Zeptej se na rozpočet, výdaje nebo úspory…"
                      disabled={busy}
                      className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    />
                    <motion.button
                      type="submit"
                      aria-label="Odeslat zprávu"
                      disabled={busy || !input.trim()}
                      whileTap={{ scale: 0.9 }}
                      className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </motion.button>
                  </form>
                </div>
              </div>
            </div>
          </RevealItem>

          <div className="flex flex-col gap-5">
            <RevealItem>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-5 pt-5">
                  <Sparkles className="size-4 text-emerald-400" />
                  <h2 className="text-[14px] font-semibold text-foreground">
                    Rychlé insighty
                  </h2>
                </div>
                {latestInsight.length === 0 ? (
                  <p className="px-5 pb-5 pt-3 text-[13px] leading-relaxed text-muted-foreground">
                    Zatím žádná data tento měsíc. Přidej transakce a uvidíš živé přehledy.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-border/40">
                    {latestInsight.map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-secondary/30"
                      >
                        <span className="text-[12px] text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="text-[14px] font-semibold tabular-nums text-foreground">
                          {item.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </RevealItem>

            <RevealItem>
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.08] via-card/40 to-card/40 p-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-emerald-500/15 blur-2xl"
                />
                <div className="relative flex items-center gap-2">
                  <CalendarClock className="size-4 text-emerald-400" />
                  <h2 className="text-[14px] font-semibold text-foreground">
                    Doporučení týdne
                  </h2>
                </div>
                <p className="relative mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {recommendation}
                </p>
              </div>
            </RevealItem>
          </div>
        </RevealGroup>
      )}
    </div>
  );
}
