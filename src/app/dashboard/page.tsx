"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Banknote,
  Tv2,
  Home,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  GripVertical,
  Settings2,
  Check,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  HelpCircle,
} from "lucide-react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { CountUp } from "@/components/ui/count-up";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { IncomeExpensesChart } from "@/components/dashboard/income-expenses-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, normalizeTransactionAmount } from "@/lib/money";
import { useProfileCurrency } from "@/lib/use-profile-currency";
import { getCategoryIcon, getCategoryName } from "./dashboard-utils";

// ─── Stat card ────────────────────────────────────────────────────────────────
type Accent = "emerald" | "red" | "indigo" | "violet";

const ACCENT: Record<Accent, { tile: string; glow: string; ring: string }> = {
  emerald: {
    tile: "bg-emerald-500/12 text-emerald-400",
    glow: "bg-emerald-500/10",
    ring: "group-hover/stat:ring-emerald-500/25",
  },
  red: {
    tile: "bg-red-500/12 text-red-400",
    glow: "bg-red-500/10",
    ring: "group-hover/stat:ring-red-500/25",
  },
  indigo: {
    tile: "bg-indigo-500/12 text-indigo-400",
    glow: "bg-indigo-500/10",
    ring: "group-hover/stat:ring-indigo-500/25",
  },
  violet: {
    tile: "bg-violet-500/12 text-violet-400",
    glow: "bg-violet-500/10",
    ring: "group-hover/stat:ring-violet-500/25",
  },
};

const DASHBOARD_CARD =
  "relative overflow-hidden ring-1 ring-foreground/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)] transition-all duration-300 hover:ring-foreground/15";

function StatCard({
  label,
  value,
  valueColor,
  badge,
  badgeDirection,
  badgeTone,
  accent,
  icon: Icon,
  delay = 0,
  currency,
}: {
  label: string;
  value: number;
  valueColor?: "green" | "red";
  badge: string;
  badgeDirection: "up" | "down" | "flat";
  /** Color of the badge; defaults to badgeDirection. Lets "good" decreases stay green. */
  badgeTone?: "up" | "down" | "flat";
  accent: Accent;
  icon: React.ComponentType<{ className?: string }>;
  delay?: number;
  currency: string;
}) {
  const a = ACCENT[accent];
  const tone = badgeTone ?? badgeDirection;
  const ArrowIcon = badgeDirection === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Card className={cn("group/stat gap-3 px-5 py-5", DASHBOARD_CARD, a.ring)}>
      {/* corner glow */}
      <span
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-2xl opacity-60 transition-opacity duration-500 group-hover/stat:opacity-100",
          a.glow,
        )}
      />
      {/* hover sheen */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.05] to-transparent transition-transform duration-700 group-hover/stat:translate-x-full" />

      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <motion.span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            a.tile,
          )}
          whileHover={{ scale: 1.1, rotate: -6 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
        >
          <Icon className="size-4" />
        </motion.span>
      </div>

      <CountUp
        value={value}
        delay={delay}
        format={(n) => formatMoney(n, currency)}
        className={cn(
          "text-[30px] font-bold leading-none tabular-nums tracking-tight",
          valueColor === "green" && "text-emerald-400",
          valueColor === "red" && "text-red-400",
          !valueColor && "text-foreground",
        )}
      />

      <span
        className={cn(
          "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
          tone === "down"
            ? "bg-red-500/12 text-red-400"
            : tone === "up"
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-indigo-500/12 text-indigo-400",
        )}
      >
        {badgeDirection !== "flat" && <ArrowIcon className="size-3" />}
        {badge}
      </span>
    </Card>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────
type CleanTransaction = {
  name: string;
  category: string;
  time: string;
  amount: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
};

type MonthlyData = {
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
};

// ─── Widget model ───────────────────────────────────────────────────────────────
type WidgetId = "stats" | "trend" | "categories" | "transactions";
type WidgetSize = "sm" | "lg";

interface WidgetState {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
}

const WIDGET_TITLES: Record<WidgetId, string> = {
  stats: "Statistiky",
  trend: "Příjmy vs Výdaje",
  categories: "Kategorie",
  transactions: "Poslední transakce",
};

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: "stats", visible: true, size: "lg" },
  { id: "trend", visible: true, size: "lg" },
  { id: "categories", visible: true, size: "sm" },
  { id: "transactions", visible: true, size: "sm" },
];

const STORAGE_KEY = "dashboard-widgets-v1";
const COMPACT_KEY = "dashboard-compact-v1";
type DashboardModal = "transaction" | null;
type DbCategory = { id: number | string; name: string };

function fmt(n: number, currency: string) {
  return formatMoney(n, currency, { sign: "auto" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const currency = useProfileCurrency();

  const currentMonthYear = useMemo(() => {
    const date = new Date();
    const month = date.toLocaleString("cs-CZ", { month: "long" });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedMonth} ${date.getFullYear()}`;
  }, []);

  const [layoutReady, setLayoutReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [modal, setModal] = useState<DashboardModal>(null);
  const [editing, setEditing] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [widgets, setWidgets] = useState<WidgetState[]>(DEFAULT_WIDGETS);

  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
    savings: 0,
  });
  const [transactions, setTransactions] = useState<CleanTransaction[]>([]);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);

  const [donutType, setDonutType] = useState<"income" | "expense">("expense");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgoText, setTimeAgoText] = useState("aktualizováno právě teď");

  useEffect(() => {
    if (!lastUpdated) return;

    function updateText() {
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - lastUpdated!.getTime()) / 60000,
      );

      if (diffInMinutes < 1) {
        setTimeAgoText("aktualizováno právě teď");
      } else if (diffInMinutes === 1) {
        setTimeAgoText("aktualizováno před 1 minutou");
      } else if (diffInMinutes < 5) {
        setTimeAgoText(`aktualizováno před ${diffInMinutes} minutami`);
      } else {
        setTimeAgoText(`aktualizováno před ${diffInMinutes} min`);
      }
    }

    updateText();
    const interval = setInterval(updateText, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const hydrated = useRef(false);

  const loading = !layoutReady || !dataReady;

  const refreshDashboardData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDataReady(true);
        return;
      }

      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const [
        { data: dbTransactions, error },
        { data: dbCategories, error: categoriesError },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            `
	            amount,
            transaction_type,
            date,
            name,
            categories ( name )
          `,
          )
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      ]);

      if (error) throw error;
      if (categoriesError) throw categoriesError;
      setCategories((dbCategories || []) as DbCategory[]);

      if (!dbTransactions || dbTransactions.length === 0) {
        setTransactions([]);
        setStats({ balance: 0, income: 0, expenses: 0, savings: 0 });
        setChartData([]);
        return;
      }

      const freshTransactions: CleanTransaction[] = dbTransactions.map((tx) => {
        const catName = getCategoryName(tx.categories);
        const iconMeta = getCategoryIcon(catName || tx.name);
        const formattedDate = new Date(tx.date).toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "short",
        });

        return {
          name: tx.name || "Transakce",
          category: catName,
          time: formattedDate,
          amount:
            tx.transaction_type === "expense"
              ? -Math.abs(tx.amount)
              : Math.abs(tx.amount),
          icon: iconMeta.icon,
          iconBg: iconMeta.bg,
        };
      });
      setTransactions(freshTransactions);

      const monthlyMap: Record<string, { income: number; expenses: number }> =
        {};
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      monthNames.forEach((m) => {
        monthlyMap[m] = { income: 0, expenses: 0 };
      });

      let totalIncome = 0;
      let totalExpenses = 0;

      dbTransactions.forEach((tx) => {
        const amount = Math.abs(tx.amount);
        const dateObj = new Date(tx.date);
        const monthLabel = monthNames[dateObj.getMonth()];

        if (tx.transaction_type === "income") {
          totalIncome += amount;
          monthlyMap[monthLabel].income += amount;
        } else if (tx.transaction_type === "expense") {
          totalExpenses += amount;
          monthlyMap[monthLabel].expenses += amount;
        }
      });

      setStats({
        balance: totalIncome - totalExpenses,
        income: totalIncome,
        expenses: totalExpenses,
        savings: totalIncome - totalExpenses,
      });

      const historyData: MonthlyData[] = monthNames.map((m) => ({
        monthLabel: m,
        income: monthlyMap[m].income,
        expenses: monthlyMap[m].expenses,
        savings: monthlyMap[m].income - monthlyMap[m].expenses,
      }));

      const currentMonthIdx = new Date().getMonth();

      setChartData(historyData.slice(0, currentMonthIdx + 1));
    } catch (err) {
      console.error("Chyba při stahování dat pro dashboard:", err);
    } finally {
      setDataReady(true);
      setLastUpdated(new Date());
    }
  }, [supabase]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshDashboardData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshDashboardData]);

  // Hydrate persisted layout, then reveal (runs once, after mount)
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WidgetState[];
          // Keep only known ids, and append any missing defaults
          const known = parsed.filter((w) => w.id in WIDGET_TITLES);
          const missing = DEFAULT_WIDGETS.filter(
            (d) => !known.some((w) => w.id === d.id),
          );
          setWidgets([...known, ...missing]);
        }
        setCompactLayout(localStorage.getItem(COMPACT_KEY) === "1");
      } catch {
        /* ignore malformed storage */
      }
      hydrated.current = true;
      setLayoutReady(true);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, []);

  // Persist (skip until after initial hydration so we don't clobber storage)
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(COMPACT_KEY, compactLayout ? "1" : "0");
  }, [compactLayout]);

  const { success, toast } = useToast();
  const visible = widgets.filter((w) => w.visible);
  const hidden = widgets.filter((w) => !w.visible);

  function handleReorder(next: WidgetState[]) {
    setWidgets([...next, ...hidden]);
  }
  function finishEditing() {
    setEditing(false);
    success("Rozložení uloženo");
  }
  function setVisible(id: WidgetId, value: boolean) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: value } : w)),
    );
  }
  function toggleSize(id: WidgetId) {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, size: w.size === "lg" ? "sm" : "lg" } : w,
      ),
    );
  }
  function resetLayout() {
    setWidgets(DEFAULT_WIDGETS);
    setCompactLayout(false);
    toast("Rozložení obnoveno");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      {/* Header */}
      <PageHeader
        title="Přehled"
        subtitle={
          <>
            {currentMonthYear}
            <span className="relative flex size-1.5 ml-2 mr-1 inline-flex">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            {timeAgoText}
          </>
        }
        actions={
          <AnimatePresence mode="popLayout" initial={false}>
            {editing ? (
              <motion.div
                key="editing"
                className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                <Button variant="ghost" size="sm" onClick={resetLayout}>
                  <RotateCcw className="size-3.5" />
                  Obnovit
                </Button>
                <Button variant="default" size="sm" onClick={finishEditing}>
                  <Check className="size-3.5" />
                  Hotovo
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setEditing(true)}
                >
                  <Settings2 className="size-3.5" />
                  Upravit widgety
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={() => setModal("transaction")}
                >
                  <Plus className="size-3.5" />
                  Přidat transakci
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        }
      />

      {/* Edit-mode toolbar */}
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3">
              <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <GripVertical className="size-4" />
                Přetáhni widgety pro změnu pořadí · měň velikost · skryj
                nepotřebné
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
                Kompaktní rozestupy
                <input
                  type="checkbox"
                  checked={compactLayout}
                  onChange={(e) => setCompactLayout(e.target.checked)}
                  className="size-4 accent-primary"
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div
          className={cn(
            "rounded-xl transition-all duration-300",
            editing && "widget-canvas p-3 sm:p-4",
          )}
        >
          <Reorder.Group
            axis="y"
            values={visible}
            onReorder={handleReorder}
            className={cn("flex flex-wrap", compactLayout ? "gap-3" : "gap-4")}
          >
            {visible.map((widget, index) => (
              <WidgetFrame
                key={widget.id}
                widget={widget}
                index={index}
                editing={editing}
                onToggleSize={() => toggleSize(widget.id)}
                onHide={() => setVisible(widget.id, false)}
              >
                <WidgetContent
                  id={widget.id}
                  stats={stats}
                  transactions={transactions}
                  chartData={chartData}
                  donutType={donutType}
                  setDonutType={setDonutType}
                  currency={currency}
                />
              </WidgetFrame>
            ))}
          </Reorder.Group>

          {/* Hidden-widget tray */}
          <AnimatePresence>
            {editing && hidden.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-4"
              >
                <span className="text-[12px] text-muted-foreground">
                  Skryté:
                </span>
                {hidden.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setVisible(w.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <Eye className="size-3" />
                    {WIDGET_TITLES[w.id]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <DashboardDialogs
        modal={modal}
        categories={categories}
        currency={currency}
        onCreated={refreshDashboardData}
        onClose={() => setModal(null)}
      />
    </div>
  );
}

// ─── Widget frame (drag / resize / hide) ───────────────────────────────────────
function WidgetFrame({
  widget,
  index,
  editing,
  onToggleSize,
  onHide,
  children,
}: {
  widget: WidgetState;
  index: number;
  editing: boolean;
  onToggleSize: () => void;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const sizeClass =
    widget.size === "lg" ? "w-full" : "w-full lg:w-[calc(50%-0.5rem)]";

  return (
    <Reorder.Item
      value={widget}
      drag={editing}
      dragListener={editing}
      layout
      className={cn("relative", sizeClass)}
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        layout: { type: "spring", stiffness: 450, damping: 38 },
      }}
      whileHover={editing ? undefined : { y: -3 }}
      whileDrag={{ scale: 1.03, zIndex: 50, cursor: "grabbing" }}
      style={{ cursor: editing ? "grab" : "default" }}
    >
      <motion.div
        className="relative h-full"
        animate={editing ? { rotate: [-0.35, 0.35] } : { rotate: 0 }}
        transition={
          editing
            ? {
                rotate: {
                  duration: 0.24,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: index * 0.05,
                },
              }
            : { duration: 0.2 }
        }
      >
        <AnimatePresence>
          {editing && (
            <>
              {/* Drag handle */}
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="absolute left-2 top-2 z-20 flex size-7 items-center justify-center rounded-lg bg-card/90 text-muted-foreground ring-1 ring-border backdrop-blur"
              >
                <GripVertical className="size-4" />
              </motion.span>

              {/* Controls */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="absolute right-2 top-2 z-20 flex gap-1"
              >
                <button
                  onClick={onToggleSize}
                  title={widget.size === "lg" ? "Zmenšit" : "Roztáhnout"}
                  className="flex size-7 items-center justify-center rounded-lg bg-card/90 text-muted-foreground ring-1 ring-border backdrop-blur transition-colors hover:text-foreground"
                >
                  {widget.size === "lg" ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </button>
                <button
                  onClick={onHide}
                  title="Skrýt"
                  className="flex size-7 items-center justify-center rounded-lg bg-card/90 text-muted-foreground ring-1 ring-border backdrop-blur transition-colors hover:text-red-400"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div
          className={cn(
            "h-full transition-opacity",
            editing && "pointer-events-none select-none",
          )}
        >
          {children}
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ─── Widget content ─────────────────────────────────────────────────────────────
function WidgetContent({
  id,
  stats,
  transactions,
  chartData,
  donutType,
  setDonutType,
  currency,
}: {
  id: WidgetId;
  stats: { balance: number; income: number; expenses: number; savings: number };
  transactions: CleanTransaction[];
  chartData: MonthlyData[];
  donutType: "income" | "expense";
  setDonutType: (t: "income" | "expense") => void;
  currency: string;
}) {
  switch (id) {
    case "stats": {
      const cur = chartData[chartData.length - 1];
      const prev = chartData[chartData.length - 2];
      const pctChange = (now: number, before: number) =>
        before > 0 ? ((now - before) / before) * 100 : now > 0 ? 100 : 0;

      const incomePct = prev ? pctChange(cur.income, prev.income) : 0;
      const expensePct = prev ? pctChange(cur.expenses, prev.expenses) : 0;
      const netDelta = cur && prev ? cur.savings - prev.savings : 0;
      const savingsRate = stats.income > 0 ? (stats.savings / stats.income) * 100 : 0;
      const prevMonth = prev?.monthLabel;

      return (
        <div className="grid h-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Zůstatek"
            value={stats.balance}
            icon={Wallet}
            accent="violet"
            badge={
              prevMonth
                ? `${formatMoney(Math.abs(netDelta), currency)} oproti ${prevMonth}`
                : "Tento rok"
            }
            badgeDirection={prevMonth ? (netDelta >= 0 ? "up" : "down") : "flat"}
            delay={0}
            currency={currency}
          />
          <StatCard
            label="Příjmy"
            value={stats.income}
            valueColor="green"
            icon={TrendingUp}
            accent="emerald"
            badge={prev ? `${Math.abs(incomePct).toFixed(1)} % MoM` : "Tento rok"}
            badgeDirection={prev ? (incomePct >= 0 ? "up" : "down") : "flat"}
            delay={0.08}
            currency={currency}
          />
          <StatCard
            label="Výdaje"
            value={stats.expenses}
            valueColor="red"
            icon={TrendingDown}
            accent="red"
            badge={prev ? `${Math.abs(expensePct).toFixed(1)} % MoM` : "Tento rok"}
            badgeDirection={prev ? (expensePct >= 0 ? "up" : "down") : "flat"}
            // For expenses a decrease is good (green), an increase is bad (red).
            badgeTone={prev ? (expensePct > 0 ? "down" : "up") : "flat"}
            delay={0.16}
            currency={currency}
          />
          <StatCard
            label="Úspory"
            value={stats.savings}
            icon={PiggyBank}
            accent="indigo"
            badge={`${savingsRate.toFixed(1)} % z příjmů`}
            badgeDirection="flat"
            delay={0.24}
            currency={currency}
          />
        </div>
      );
    }

    case "trend":
      return (
        <Card className={cn("h-full gap-0 px-5 pb-3 pt-5", DASHBOARD_CARD)}>
          <span className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-emerald-500/[0.07] blur-3xl" />
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                <TrendingUp className="size-4.5" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">
                  Příjmy vs Výdaje
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  Posledních 6 měsíců
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium",
                stats.savings >= 0
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-400/20 bg-red-500/10 text-red-300",
              )}
            >
              {stats.savings >= 0
                ? `${formatMoney(stats.savings, currency)} úspora`
                : `${formatMoney(Math.abs(stats.savings), currency)} v mínusu`}
            </span>
          </div>
          {/* legend */}
          <div className="mb-1 flex items-center gap-4 pl-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: "oklch(0.75 0.15 145)" }}
              />
              Příjmy
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: "oklch(0.65 0.18 200)" }}
              />
              Výdaje
            </span>
          </div>
          <IncomeExpensesChart data={chartData} currency={currency} />
        </Card>
      );

    case "categories":
      return (
        <Card className={cn("h-full gap-4 px-5 py-5", DASHBOARD_CARD)}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">
              Kategorie
            </h2>

            <div className="flex items-center rounded-lg bg-secondary/50 p-0.5 text-[12px]">
              <button
                onClick={() => setDonutType("income")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  donutType === "income"
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Příjmy
              </button>
              <button
                onClick={() => setDonutType("expense")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  donutType === "expense"
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Výdaje
              </button>
            </div>
          </div>

          <CategoryDonut transactions={transactions} type={donutType} />
        </Card>
      );

    case "transactions":
      return (
        <Card className={cn("h-full gap-3 px-5 py-5", DASHBOARD_CARD)}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">
              Poslední transakce
            </h2>
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {transactions.length} celkem
            </span>
          </div>
          <ul className="flex flex-col">
            {transactions.slice(0, 4).map((tx, index) => (
              <motion.li
                key={tx.name + tx.time + index}
                className="group/tx -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/50"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.18 + index * 0.04,
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                }}
              >
                <motion.span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    tx.iconBg,
                  )}
                >
                  <tx.icon className="size-4" />
                </motion.span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    {tx.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {tx.category} · {tx.time}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[13px] font-semibold tabular-nums",
                    tx.amount > 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fmt(tx.amount, currency)}
                </span>
              </motion.li>
            ))}
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Žádné transakce nenalezeny.
              </p>
            )}
          </ul>
          <Link
            href="/transactions"
            className="mt-1 block text-center text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Zobrazit všechny transakce →
          </Link>
        </Card>
      );
  }
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardDialogs({
  modal,
  categories,
  currency,
  onCreated,
  onClose,
}: {
  modal: DashboardModal;
  categories: DbCategory[];
  currency: string;
  onCreated: () => Promise<void>;
  onClose: () => void;
}) {
  const supabase = createClient();
  const { success, error: errorToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = String(formData.get("name") || "").trim();
      const date = String(formData.get("date") || "");
      const rawAmount = Number(formData.get("amount"));
      const transactionType = formData.get("transaction_type") as
        | "income"
        | "expense";
      const categoryId = formData.get("category_id")
        ? Number(formData.get("category_id"))
        : null;

      if (!name || !date || !Number.isFinite(rawAmount) || rawAmount <= 0) {
        throw new Error("Vyplň název, datum a kladnou částku.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Uživatel není přihlášen.");

      const { error } = await supabase.from("transactions").insert({
        name,
        date,
        amount: normalizeTransactionAmount(rawAmount, transactionType),
        currency,
        user_id: user.id,
        transaction_type: transactionType,
        category_id: categoryId,
      });

      if (error) throw error;

      success("Transakce přidána", "Nový záznam je uložený v Supabase.");
      await onCreated();
      onClose();
    } catch (err) {
      errorToast(
        "Chyba při ukládání",
        err instanceof Error ? err.message : "Transakci se nepodařilo uložit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={modal === "transaction"}
      title="Přidat transakci"
      description="Stejný frontend kontrakt jako na stránce Transakce, připravený pro Supabase insert."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="dashboard-tx-name">Název</Label>
          <Input
            id="dashboard-tx-name"
            name="name"
            placeholder="Např. Kavárna"
            required
            disabled={submitting}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="dashboard-tx-type">Typ</Label>
            <select
              id="dashboard-tx-type"
              name="transaction_type"
              defaultValue="expense"
              disabled={submitting}
              className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="expense" className="bg-zinc-900 text-foreground">
                Výdaj
              </option>
              <option value="income" className="bg-zinc-900 text-foreground">
                Příjem
              </option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dashboard-tx-date">Datum</Label>
            <Input
              id="dashboard-tx-date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dashboard-tx-amount">Částka</Label>
            <Input
              id="dashboard-tx-amount"
              name="amount"
              type="number"
              min="0"
              step="any"
              placeholder="280"
              required
              disabled={submitting}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dashboard-tx-category">Kategorie</Label>
          <select
            id="dashboard-tx-category"
            name="category_id"
            disabled={submitting}
            className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" className="bg-zinc-900 text-foreground">
              Bez kategorie
            </option>
            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
                className="bg-zinc-900 text-foreground"
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Zrušit
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Ukládám..." : "Přidat"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
