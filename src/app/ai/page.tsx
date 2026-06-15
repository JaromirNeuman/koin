"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { AiBlob } from "@/components/ui/ai-blob";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/money";
import { useProfileCurrency } from "@/lib/use-profile-currency";
import { cn } from "@/lib/utils";

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

function catName(categories: unknown): string {
  if (Array.isArray(categories)) {
    const f = categories[0];
    return f && typeof f === "object" && "name" in f ? String(f.name) : "Bez kategorie";
  }
  return categories && typeof categories === "object" && "name" in categories
    ? String((categories as { name: string }).name)
    : "Bez kategorie";
}

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

// ─── Contextual follow-up suggestions ───────────────────────────────────────────
function suggestFollowUps(text: string): string[] {
  const t = text.toLowerCase();
  if (t.includes("limit"))
    return [
      "Nastav konkrétní limity",
      "Kolik ušetřím za 3 měsíce?",
      "Co když limit překročím?",
    ];
  if (t.includes("rozpoč"))
    return [
      "Uprav rozpočet na úspory 50 %",
      "Přidej rezervu na auto",
      "Kde nejvíc utrácím?",
    ];
  if (t.includes("zůstat") || t.includes("předpov") || t.includes("březn"))
    return ["Jak zrychlit růst zůstatku?", "Naplánuj rozpočet", "Kde ušetřím?"];
  return ["Kde ušetřím?", "Naplánuj rozpočet", "Předpověď zůstatku"];
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      <PageHeader
        title="AI Přehled"
        subtitle="Osobní finanční asistent nad vašimi transakcemi"
        actions={
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              busy
                ? "border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
            )}
          >
            <span className="relative flex size-1.5">
              <motion.span
                className={cn(
                  "absolute inline-flex size-full rounded-full",
                  busy ? "bg-indigo-300" : "bg-emerald-300",
                )}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: busy ? [1, 1.6, 1] : 1,
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span
                className={cn(
                  "relative inline-flex size-1.5 rounded-full",
                  busy ? "bg-indigo-300" : "bg-emerald-300",
                )}
              />
            </span>
            {busy ? "Píše…" : "Připraveno"}
          </div>
        }
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
            <Card className="h-full min-h-0 gap-0 overflow-hidden ring-1 ring-foreground/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <AiBlob size={32} />
                  <div>
                    <h2 className="text-[14px] font-semibold leading-tight text-foreground">
                      Koin AI
                    </h2>
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

                    return (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 460,
                          damping: 32,
                        }}
                        className={cn(
                          "flex gap-3",
                          assistant ? "justify-start" : "justify-end",
                        )}
                      >
                        {assistant && <AiBlob size={32} className="mt-0.5" />}
                        <div
                          className={cn(
                            "max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-5 shadow-sm",
                            assistant
                              ? "rounded-tl-sm border border-border/70 bg-secondary/40 text-foreground"
                              : "rounded-tr-sm bg-primary text-primary-foreground",
                          )}
                        >
                          {assistant ? (
                            <Markdown content={message.content} />
                          ) : (
                            message.content
                          )}
                        </div>
                        {!assistant && (
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                            <User className="size-4" />
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
                        <AiBlob size={32} className="mt-0.5" />
                        <div className="flex items-center rounded-2xl rounded-tl-sm border border-border/70 bg-secondary/40 px-4 py-3">
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
                          className="flex flex-wrap gap-2 pl-11"
                        >
                          {suggestFollowUps(lastMessage.content).map((s, i) => (
                            <motion.button
                              key={s}
                              onClick={() => sendMessage(s)}
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              whileTap={{ scale: 0.94 }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[12px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                            >
                              <Sparkles className="size-3 text-primary" />
                              {s}
                            </motion.button>
                          ))}
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
                  <h2 className="text-[15px] font-semibold text-foreground">
                    Rychlé insighty
                  </h2>
                </div>
                <div className="grid gap-3">
                  {latestInsight.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 bg-secondary/20 px-3 py-4 text-[13px] text-muted-foreground">
                      Zatím žádná data tento měsíc. Přidejte transakce a uvidíte živé přehledy.
                    </p>
                  ) : (
                    latestInsight.map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07 }}
                        className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-3 transition-colors hover:border-foreground/15 hover:bg-secondary/50"
                      >
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[15px] font-semibold text-foreground">
                          {item.value}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </Card>
            </RevealItem>

            <RevealItem>
              <Card className="px-5 py-5 ring-1 ring-foreground/[0.08]">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  <h2 className="text-[15px] font-semibold text-foreground">
                    Doporučení týdne
                  </h2>
                </div>
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {recommendation}
                </p>
              </Card>
            </RevealItem>
          </div>
        </RevealGroup>
      )}
    </div>
  );
}
