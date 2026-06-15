"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  ListOrdered,
  PiggyBank,
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

type AggregatedExpense = { name: string; value: number };
type MonthlyData = {
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
};

function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    const first = categories[0];
    return typeof first === "object" && first !== null && "name" in first
      ? String(first.name)
      : "Bez kategorie";
  }

  return typeof categories === "object" &&
    categories !== null &&
    "name" in categories
    ? String(categories.name)
    : "Bez kategorie";
}

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

        const sortedExpenses = Object.entries(categoryMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        setTopExpenses(sortedExpenses);

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
          currency={currency}
        />
      )}
    </div>
  );
}

function AnalyticsContent({
  avgExpenses,
  avgIncome,
  totalSavings,
  topExpenses,
  monthlyHistory,
  currency,
}: {
  avgExpenses: number;
  avgIncome: number;
  totalSavings: number;
  topExpenses: AggregatedExpense[];
  monthlyHistory: MonthlyData[];
  currency: string;
}) {
  return (
    <RevealGroup className="flex flex-col gap-6">
      {/* Hlavní metriky */}
      <div className="grid gap-4 md:grid-cols-3">
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
      </div>
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
