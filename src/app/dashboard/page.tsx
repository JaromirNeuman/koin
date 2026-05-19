import {
  ShoppingCart,
  Banknote,
  Tv2,
  Home,
  TrendingUp,
  TrendingDown,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IncomeExpensesChart } from "@/components/dashboard/income-expenses-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  valueColor,
  badge,
  badgeVariant = "green",
}: {
  label: string;
  value: string;
  valueColor?: "green" | "red";
  badge: string;
  badgeVariant?: "green" | "red" | "blue";
}) {
  return (
    <Card className="gap-2 px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-[28px] font-bold leading-none tabular-nums tracking-tight",
          valueColor === "green" && "text-emerald-400",
          valueColor === "red"   && "text-red-400",
          !valueColor             && "text-foreground"
        )}
      >
        {value}
      </p>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
          badgeVariant === "green" && "bg-emerald-500/12 text-emerald-400",
          badgeVariant === "red"   && "bg-red-500/12 text-red-400",
          badgeVariant === "blue"  && "bg-indigo-500/12 text-indigo-400"
        )}
      >
        {badge}
      </span>
    </Card>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  {
    name: "Lidl",
    category: "Jídlo",
    time: "Dnes, 09:14",
    amount: -28.50,
    icon: ShoppingCart,
    iconBg: "bg-orange-500/10 text-orange-400",
  },
  {
    name: "Výplata",
    category: "Příjem",
    time: "Dnes, 08:00",
    amount: 3800,
    icon: Banknote,
    iconBg: "bg-emerald-500/10 text-emerald-400",
  },
  {
    name: "Netflix",
    category: "Zábava",
    time: "Včera, 23:59",
    amount: -12.99,
    icon: Tv2,
    iconBg: "bg-purple-500/10 text-purple-400",
  },
  {
    name: "Nájem",
    category: "Bydlení",
    time: "20. led",
    amount: -750,
    icon: Home,
    iconBg: "bg-blue-500/10 text-blue-400",
  },
];

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("cs", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `€${abs}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Přehled</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Únor 2026 · aktualizované před 2 min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Edit layout</Button>
          <Button variant="secondary" size="sm">
            <Plus className="size-3.5" />
            Přidat transakci
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Zůstatek"
          value="€4 820"
          badge="+€320 oproti prosinci"
          badgeVariant="green"
        />
        <StatCard
          label="Příjmy"
          value="€4 300"
          valueColor="green"
          badge="+12.5% MoM"
          badgeVariant="green"
        />
        <StatCard
          label="Výdaje"
          value="€2 340"
          valueColor="red"
          badge="−8.2% MoM"
          badgeVariant="red"
        />
        <StatCard
          label="Úspory"
          value="€1 960"
          badge="45.6% z příjmů"
          badgeVariant="blue"
        />
      </div>

      {/* Area chart */}
      <Card className="gap-0 px-5 pb-3 pt-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Příjmy vs Výdaje</h2>
            <p className="text-[12px] text-muted-foreground">Posledních 6 měsíců</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-[12px] font-medium text-emerald-400">
            <TrendingUp className="size-3" />
            €1 960 úspory
          </span>
        </div>
        <IncomeExpensesChart />
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Category donut */}
        <Card className="col-span-2 gap-3 px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Kategorie</h2>
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <button className="hover:text-foreground transition-colors">Příjmy</button>
              <span className="opacity-40">|</span>
              <button className="font-medium text-foreground">Výdaje</button>
            </div>
          </div>
          <CategoryDonut />
        </Card>

        {/* Recent transactions */}
        <Card className="col-span-3 gap-3 px-5 py-5">
          <h2 className="text-[15px] font-semibold text-foreground">Poslední transakce</h2>
          <ul className="flex flex-col divide-y divide-border/40">
            {TRANSACTIONS.map((tx) => (
              <li key={tx.name + tx.time} className="flex items-center gap-3 py-3 first:pt-1">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    tx.iconBg
                  )}
                >
                  <tx.icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-medium text-foreground">{tx.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {tx.category} · {tx.time}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[13px] font-semibold tabular-nums",
                    tx.amount > 0 ? "text-emerald-400" : "text-foreground"
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {fmt(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-1 text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Zobrazit všechny transakce →
          </button>
        </Card>
      </div>
    </div>
  );
}

