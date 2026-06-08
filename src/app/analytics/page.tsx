"use client";

import { useEffect, useState } from "react";
import { BarChart3, ListOrdered, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IncomeExpensesChart } from "@/components/dashboard/income-expenses-chart";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SAVINGS = [1100, 980, 1180, 900, 1100, 1490];
const EXPENSES = [
  { name: "Nájem", value: 850 },
  { name: "Auto", value: 420 },
  { name: "Jídlo", value: 310 },
  { name: "Zábava", value: 190 },
  { name: "Předplatné", value: 60 },
];

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
          tone === "red" && "text-red-400"
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function SavingsBars() {
  const max = Math.max(...SAVINGS);

  return (
    <div className="flex h-64 items-end gap-4 px-2 pt-8">
      {SAVINGS.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-48 w-full items-end rounded-md bg-secondary/25">
            <div
              className="w-full rounded-md bg-emerald-500/90 shadow-[0_0_18px_oklch(0.72_0.16_145_/_18%)]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {["Aug", "Sep", "Okt", "Nov", "Dec", "Jan"][index]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-7 lg:px-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytika</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Únor 2026 · aktualizované před 2 min
        </p>
      </header>

      {loading ? <AnalyticsSkeleton /> : <AnalyticsContent />}
    </div>
  );
}

function AnalyticsContent() {
  return (
    <RevealGroup className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <RevealItem>
        <MetricCard label="Průměrné měsíční výdaje" value="€2 340" tone="red" icon={TrendingDown} />
        </RevealItem>
        <RevealItem>
        <MetricCard label="Průměrný příjem" value="€4 300" tone="green" icon={TrendingUp} />
        </RevealItem>
        <RevealItem>
        <MetricCard label="Úspora za 6 měsíců" value="€1 960" icon={PiggyBank} />
        </RevealItem>
      </div>

      <RevealItem>
      <Card className="gap-0 px-5 pb-3 pt-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold text-foreground">Příjmy vs Výdaje</h2>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">Posledních 6 měsíců</p>
          </div>
          <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[12px] font-medium text-indigo-300">
            €1 960 úspory
          </span>
        </div>
        <IncomeExpensesChart />
      </Card>
      </RevealItem>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.5fr]">
        <RevealItem>
        <Card className="px-5 py-5">
          <h2 className="text-[15px] font-semibold text-foreground">Trend úspor</h2>
          <SavingsBars />
        </Card>
        </RevealItem>

        <RevealItem>
        <Card className="px-5 py-5">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold text-foreground">Největší výdaje</h2>
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {EXPENSES.map((expense) => (
              <div key={expense.name} className="flex items-center justify-between py-3 text-[13px]">
                <span className="text-foreground">{expense.name}</span>
                <span className="font-medium tabular-nums text-foreground">€{expense.value}</span>
              </div>
            ))}
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
