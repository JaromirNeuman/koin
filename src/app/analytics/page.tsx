"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  Hash,
  Layers,
  ListOrdered,
  Percent,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { IncomeExpensesChart } from "@/components/dashboard/income-expenses-chart";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/money";
import { useProfileCurrency } from "@/lib/use-profile-currency";
import { getCategoryName } from "./analytics-utils";

type AggregatedExpense = { name: string; value: number };
type MonthlyData = {
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
};

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
  icon: typeof TrendingUp;
}) {
  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p
        className={cn(
          "text-3xl font-semibold tracking-tight tabular-nums",
          tone === "green" && "text-emerald-400",
          tone === "red" && "text-red-400",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

export function SavingsBars({
  data,
  currency = "CZK",
}: {
  data: MonthlyData[];
  currency?: string;
}) {
  const absoluteSavings = data.map((d) => Math.abs(d.savings));
  const max = Math.max(...absoluteSavings, 1);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative h-64 px-2 pt-8">
      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-10 rounded-md border px-2.5 py-1.5 text-[12px] font-medium shadow-md pointer-events-none tabular-nums whitespace-nowrap",
              data[hoveredIndex].savings >= 0
                ? "border-border bg-popover text-popover-foreground"
                : "border-red-500/30 bg-red-950/90 text-red-200",
            )}
            style={{
              left: `${(hoveredIndex / data.length) * 100 + 100 / data.length / 2}%`,
              transform: "translateX(-50%)",
              top: "0px",
            }}
          >
            {formatMoney(data[hoveredIndex].savings, currency, {
              sign: "auto",
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-full items-end gap-4">
        {data.map((item, index) => {
          const isNegative = item.savings < 0;
          const percentage = Math.max((Math.abs(item.savings) / max) * 100, 2);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex h-48 w-full items-end rounded-md bg-secondary/25">
                <div
                  className={cn(
                    "w-full rounded-md transition-all duration-300",
                    isNegative
                      ? "bg-red-500/90 shadow-[0_0_18px_oklch(0.62_0.18_20_/_18%)]"
                      : "bg-emerald-500/90 shadow-[0_0_18px_oklch(0.72_0.16_145_/_18%)]",
                  )}
                  style={{
                    height: `${percentage}%`,
                    filter: isHovered ? "brightness(1.15)" : "none",
                  }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground truncate w-full text-center">
                {item.monthLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageFallback />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}

function AnalyticsPageFallback() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      <PageHeader title="Analytika" subtitle="Načítám přehled..." />
      <AnalyticsSkeleton />
    </div>
  );
}

function AnalyticsPageContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const currency = useProfileCurrency();

  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.get("year") || currentYear.toString();

  const [loading, setLoading] = useState(true);

  const [avgExpenses, setAvgExpenses] = useState(0);
  const [avgIncome, setAvgIncome] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [topExpenses, setTopExpenses] = useState<AggregatedExpense[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyData[]>([]);

  const [savingsRate, setSavingsRate] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<AggregatedExpense[]>([]);
  const [bestMonth, setBestMonth] = useState<MonthlyData | null>(null);
  const [avgDailySpend, setAvgDailySpend] = useState(0);

  useEffect(() => {
    async function fetchAndCalculateAnalytics() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;

        const { data: transactions, error } = await supabase
          .from("transactions")
          .select(
            `
            amount,
            transaction_type,
            date,
            categories ( name )
          `,
          )
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (error) throw error;

        if (!transactions || transactions.length === 0) {
          setAvgExpenses(0);
          setAvgIncome(0);
          setTotalSavings(0);
          setTopExpenses([]);
          setMonthlyHistory([]);
          setSavingsRate(0);
          setTransactionCount(0);
          setCategoryBreakdown([]);
          setBestMonth(null);
          setAvgDailySpend(0);
          return;
        }

        const categoryMap: Record<string, number> = {};
        const monthlyMap: Record<string, { income: number; expenses: number }> =
          {};

        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "Maj",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Okt",
          "Nov",
          "Dec",
        ];
        monthNames.forEach((m) => {
          monthlyMap[m] = { income: 0, expenses: 0 };
        });

        let totalIncome = 0;
        let totalExpenses = 0;
        const activeMonths = new Set<string>();

        transactions.forEach((tx) => {
          const amount = Math.abs(tx.amount);
          const dateObj = new Date(tx.date);
          const monthLabel = monthNames[dateObj.getMonth()];
          activeMonths.add(monthLabel);

          if (tx.transaction_type === "income") {
            totalIncome += amount;
            monthlyMap[monthLabel].income += amount;
          } else if (tx.transaction_type === "expense") {
            totalExpenses += amount;
            monthlyMap[monthLabel].expenses += amount;

            const catName = getCategoryName(tx.categories);
            categoryMap[catName] = (categoryMap[catName] || 0) + amount;
          }
        });

        const monthsCount = activeMonths.size || 1;

        setAvgIncome(totalIncome / monthsCount);
        setAvgExpenses(totalExpenses / monthsCount);
        setTotalSavings(totalIncome - totalExpenses);

        const sortedCategories = Object.entries(categoryMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        setCategoryBreakdown(sortedCategories);
        setTopExpenses(sortedCategories.slice(0, 5));

        const historyData: MonthlyData[] = monthNames.map((m) => ({
          monthLabel: m,
          income: monthlyMap[m].income,
          expenses: monthlyMap[m].expenses,
          savings: monthlyMap[m].income - monthlyMap[m].expenses,
        }));

        const currentMonthIdx = new Date().getMonth();
        const filteredHistory =
          selectedYear === currentYear.toString()
            ? historyData.slice(0, currentMonthIdx + 1)
            : historyData;

        setMonthlyHistory(filteredHistory);

        // Derived insights
        setSavingsRate(totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0);
        setTransactionCount(transactions.length);
        setAvgDailySpend(totalExpenses / (monthsCount * 30));
        const activeHistory = filteredHistory.filter((m) => m.income > 0 || m.expenses > 0);
        setBestMonth(
          activeHistory.reduce<MonthlyData | null>(
            (best, m) => (best === null || m.savings > best.savings ? m : best),
            null,
          ),
        );
      } catch (err) {
        console.error("Chyba při výpočtu analytiky:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAndCalculateAnalytics();
  }, [supabase, selectedYear, currentYear]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      <PageHeader
        title="Analytika"
        subtitle={`Přehled za rok ${selectedYear} · Aktualizováno právě teď`}
      />

      {loading ? (
        <AnalyticsSkeleton />
      ) : (
        <AnalyticsContent
          avgExpenses={avgExpenses}
          avgIncome={avgIncome}
          totalSavings={totalSavings}
          topExpenses={topExpenses}
          monthlyHistory={monthlyHistory}
          savingsRate={savingsRate}
          transactionCount={transactionCount}
          categoryBreakdown={categoryBreakdown}
          bestMonth={bestMonth}
          avgDailySpend={avgDailySpend}
          currency={currency}
        />
      )}
    </div>
  );
}

const BAR_COLORS = [
  "oklch(0.68 0.2 300)",
  "oklch(0.60 0.22 270)",
  "oklch(0.70 0.16 200)",
  "oklch(0.72 0.16 150)",
  "oklch(0.74 0.15 90)",
  "oklch(0.72 0.15 50)",
  "oklch(0.62 0.2 25)",
  "oklch(0.50 0.06 255)",
];

function CategoryBars({
  data,
  currency,
}: {
  data: AggregatedExpense[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[12px] text-muted-foreground">
        Žádné výdaje pro toto období.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.slice(0, 8).map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                />
                {d.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatMoney(d.value, currency)} · {pct.toFixed(0)} %
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
              <motion.div
                className="h-full rounded-full"
                style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / max) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-secondary/30 px-3 py-3 transition-colors hover:border-foreground/15 hover:bg-secondary/50">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-[16px] font-semibold tabular-nums text-foreground">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function AnalyticsContent({
  avgExpenses,
  avgIncome,
  totalSavings,
  topExpenses,
  monthlyHistory,
  savingsRate,
  transactionCount,
  categoryBreakdown,
  bestMonth,
  avgDailySpend,
  currency,
}: {
  avgExpenses: number;
  avgIncome: number;
  totalSavings: number;
  topExpenses: AggregatedExpense[];
  monthlyHistory: MonthlyData[];
  savingsRate: number;
  transactionCount: number;
  categoryBreakdown: AggregatedExpense[];
  bestMonth: MonthlyData | null;
  avgDailySpend: number;
  currency: string;
}) {
  return (
    <RevealGroup className="flex flex-col gap-6">
      {/* Hlavní metriky */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <MetricCard
            label="Průměrné měsíční výdaje"
            value={formatMoney(avgExpenses, currency)}
            tone="red"
            icon={TrendingDown}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            label="Průměrný příjem"
            value={formatMoney(avgIncome, currency)}
            tone="green"
            icon={TrendingUp}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            label="Čistá úspora za rok"
            value={formatMoney(totalSavings, currency, { sign: "auto" })}
            tone={totalSavings >= 0 ? "green" : "red"}
            icon={PiggyBank}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            label="Míra úspor"
            value={`${savingsRate.toFixed(1)} %`}
            tone={savingsRate >= 0 ? "green" : "red"}
            icon={Percent}
          />
        </RevealItem>
      </div>

      {/* Poznatky */}
      <RevealItem>
        <Card className="px-4 py-5 sm:px-5">
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h2 className="text-[15px] font-semibold text-foreground">Poznatky</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightTile
              icon={CalendarRange}
              label="Nejúspornější měsíc"
              value={bestMonth ? bestMonth.monthLabel : "—"}
              sub={bestMonth ? formatMoney(bestMonth.savings, currency, { sign: "auto" }) : undefined}
            />
            <InsightTile
              icon={Layers}
              label="Největší kategorie"
              value={topExpenses[0]?.name ?? "—"}
              sub={topExpenses[0] ? formatMoney(topExpenses[0].value, currency) : undefined}
            />
            <InsightTile
              icon={Receipt}
              label="Průměrná denní útrata"
              value={formatMoney(avgDailySpend, currency)}
            />
            <InsightTile
              icon={Hash}
              label="Počet transakcí"
              value={String(transactionCount)}
            />
          </div>
        </Card>
      </RevealItem>
      <RevealItem>
        <Card className="gap-0 px-4 pb-3 pt-5 sm:px-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <h2 className="text-[15px] font-semibold text-foreground">
                  Příjmy vs Výdaje
                </h2>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Přehled po měsících
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium",
                totalSavings >= 0
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-400/20 bg-red-500/10 text-red-300",
              )}
            >
              {totalSavings >= 0
                ? `${formatMoney(totalSavings, currency)} úspora`
                : `${formatMoney(Math.abs(totalSavings), currency)} v mínusu`}
            </span>
          </div>
          <IncomeExpensesChart data={monthlyHistory} currency={currency} />
        </Card>
      </RevealItem>

      <RevealItem>
        <Card className="px-4 py-5 sm:px-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold text-foreground">
              Výdaje podle kategorií
            </h2>
          </div>
          <CategoryBars data={categoryBreakdown} currency={currency} />
        </Card>
      </RevealItem>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.5fr]">
        <RevealItem>
          <Card className="px-4 py-5 sm:px-5">
            <h2 className="text-[15px] font-semibold text-foreground">
              Trend měsíčních úspor
            </h2>
            <SavingsBars data={monthlyHistory} currency={currency} />
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="px-4 py-5 sm:px-5">
            <div className="flex items-center gap-2 mb-3">
              <ListOrdered className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold text-foreground">
                Největší výdaje
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-border/60">
              {topExpenses.map((expense) => (
                <div
                  key={expense.name}
                  className="flex items-center justify-between py-3 text-[13px]"
                >
                  <span className="text-foreground">{expense.name}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatMoney(expense.value, currency)}
                  </span>
                </div>
              ))}
              {topExpenses.length === 0 && (
                <p className="text-[12px] text-muted-foreground py-4 text-center">
                  Žádné výdaje pro tento rok.
                </p>
              )}
            </div>
          </Card>
        </RevealItem>
      </div>
    </RevealGroup>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.5fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </>
  );
}
