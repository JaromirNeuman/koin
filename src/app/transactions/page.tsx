"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TRANSACTIONS = [
  { date: "3. 2. 2026", name: "Lidl", category: "Jídlo", amount: -28.5 },
  { date: "2. 2. 2026", name: "Výplata", category: "Příjem", amount: 3800 },
  { date: "1. 2. 2026", name: "Netflix", category: "Zábava", amount: -12.99 },
  { date: "31. 1. 2026", name: "České dráhy", category: "Doprava", amount: -18.2 },
  { date: "29. 1. 2026", name: "Freelance projekt", category: "Příjem", amount: 540 },
  { date: "28. 1. 2026", name: "Knihy Dobrovský", category: "Vzdělávání", amount: -34.9 },
];

const CATEGORIES = ["Jídlo", "Bydlení", "Doprava", "Zábava", "Vzdělávání"];
const RECURRING = [
  { name: "Nájem", amount: 750, interval: "Měsíčně", category: "Bydlení" },
  { name: "Netflix", amount: 12.99, interval: "Měsíčně", category: "Zábava" },
  { name: "Spotify", amount: 6.99, interval: "Měsíčně", category: "Zábava" },
];

type Transaction = (typeof TRANSACTIONS)[number];
type Recurring = (typeof RECURRING)[number];
type ModalState =
  | { type: "transaction"; transaction?: Transaction }
  | { type: "category"; category?: string }
  | { type: "delete-category"; category: string }
  | { type: "recurring"; item?: Recurring }
  | null;

function formatAmount(amount: number) {
  return `${amount > 0 ? "+" : "-"} €${Math.abs(amount).toLocaleString("cs", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(timeout);
  }, []);

  const filteredTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return TRANSACTIONS;

    return TRANSACTIONS.filter((tx) =>
      [tx.name, tx.category, tx.date].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query]);

  function closeModal() {
    setModal(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-7 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transakce</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Únor 2026 · aktualizované před 2 min
          </p>
        </div>
        <Button
          className="h-9 gap-2 bg-primary px-3 text-primary-foreground"
          onClick={() => setModal({ type: "transaction" })}
        >
          <Plus className="size-4" />
          Přidat transakci
        </Button>
      </header>

      {loading ? (
        <TransactionsSkeleton />
      ) : (
        <RevealGroup className="flex flex-col gap-6">
        <RevealItem>
      <Card className="gap-0 px-5 py-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <ReceiptText className="size-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Historie transakcí</h2>
              <p className="text-[12px] text-muted-foreground">6 posledních pohybů na účtu</p>
            </div>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Hledat transakci..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead className="bg-secondary/35 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Datum</th>
                <th className="px-4 py-3 font-semibold">Název</th>
                <th className="px-4 py-3 font-semibold">Kategorie</th>
                <th className="px-4 py-3 text-right font-semibold">Částka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTransactions.map((tx) => (
                <tr key={`${tx.date}-${tx.name}-${tx.amount}`} className="transition-colors hover:bg-secondary/20">
                  <td className="px-4 py-3.5 text-muted-foreground">{tx.date}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <button className="hover:underline" onClick={() => setModal({ type: "transaction", transaction: tx })}>
                      {tx.name}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-secondary/70 px-2.5 py-1 text-[12px] text-secondary-foreground">
                      {tx.category}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3.5 text-right font-semibold tabular-nums",
                      tx.amount > 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {tx.amount > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                      {formatAmount(tx.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Button variant="secondary" size="icon-sm" aria-label="Předchozí stránka">
            <ChevronLeft className="size-4" />
          </Button>
          {[1, 2, 3, 4].map((page) => (
            <Button
              key={page}
              variant={page === 1 ? "default" : "secondary"}
              size="icon-sm"
              aria-label={`Stránka ${page}`}
            >
              {page}
            </Button>
          ))}
          <Button variant="secondary" size="icon-sm" aria-label="Další stránka">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </Card>
        </RevealItem>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <RevealItem>
        <Card className="px-5 py-5">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            <h2 className="text-[15px] font-semibold text-foreground">Správa kategorií</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-1.5 text-[12px]"
              >
                <button onClick={() => setModal({ type: "category", category })}>{category}</button>
                <button onClick={() => setModal({ type: "delete-category", category })} aria-label={`Smazat ${category}`}>
                  <X className="size-3.5 text-red-400" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input className="h-10" placeholder="Nová kategorie..." />
            <Button className="h-10 w-12" aria-label="Přidat kategorii" onClick={() => setModal({ type: "category" })}>
              <Plus className="size-4" />
            </Button>
          </div>
        </Card>
        </RevealItem>

        <RevealItem>
        <Card className="px-5 py-5">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-primary" />
            <h2 className="text-[15px] font-semibold text-foreground">Trvalé příkazy</h2>
          </div>
          <div className="flex flex-col gap-2">
            {RECURRING.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/45 px-3 py-3"
              >
                <div>
                  <p className="text-[13px] font-medium text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.interval} · €{item.amount.toFixed(2)} · {item.category}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Upravit ${item.name}`}
                  onClick={() => setModal({ type: "recurring", item })}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="h-10" onClick={() => setModal({ type: "recurring" })}>
            <Plus className="size-4" />
            Přidat trvalý příkaz
          </Button>
        </Card>
        </RevealItem>
      </div>
        </RevealGroup>
      )}

      <TransactionDialogs modal={modal} onClose={closeModal} />
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <>
      <Card className="gap-4 px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-72" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  );
}

function TransactionDialogs({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const isTransaction = modal?.type === "transaction";
  const isCategory = modal?.type === "category";
  const isDeleteCategory = modal?.type === "delete-category";
  const isRecurring = modal?.type === "recurring";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onClose();
  }

  return (
    <>
      <Modal
        open={isTransaction}
        title={modal?.type === "transaction" && modal.transaction ? "Upravit transakci" : "Přidat transakci"}
        description="Formulář je připravený pro napojení na tabulku transakcí v Supabase."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="transaction-name">Název</Label>
            <Input id="transaction-name" name="name" defaultValue={isTransaction ? modal.transaction?.name : ""} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transaction-date">Datum</Label>
              <Input id="transaction-date" name="date" type="date" defaultValue="2026-02-03" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-amount">Částka</Label>
              <Input
                id="transaction-amount"
                name="amount"
                type="number"
                step="0.01"
                defaultValue={isTransaction ? modal.transaction?.amount : ""}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transaction-category">Kategorie</Label>
            <select
              id="transaction-category"
              name="category"
              defaultValue={isTransaction ? modal.transaction?.category : "Jídlo"}
              className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit">Uložit</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCategory}
        title={modal?.type === "category" && modal.category ? "Upravit kategorii" : "Přidat kategorii"}
        description="Kategorie se později uloží do Supabase a použije ve formulářích transakcí."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Název kategorie</Label>
            <Input id="category-name" name="name" defaultValue={isCategory ? modal.category : ""} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit">Uložit</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isDeleteCategory}
        title="Smazat kategorii"
        description={isDeleteCategory ? `Kategorie "${modal.category}" se odebere z číselníku. Backend může před smazáním zkontrolovat navázané transakce.` : undefined}
        onClose={onClose}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
          <Button type="button" variant="destructive" onClick={onClose}>Smazat</Button>
        </div>
      </Modal>

      <Modal
        open={isRecurring}
        title={modal?.type === "recurring" && modal.item ? "Upravit trvalý příkaz" : "Přidat trvalý příkaz"}
        description="Opakovaná platba může backendu vytvořit šablonu pro automatické transakce."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="recurring-name">Název</Label>
            <Input id="recurring-name" name="name" defaultValue={isRecurring ? modal.item?.name : ""} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="recurring-amount">Částka</Label>
              <Input id="recurring-amount" name="amount" type="number" step="0.01" defaultValue={isRecurring ? modal.item?.amount : ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recurring-day">Den v měsíci</Label>
              <Input id="recurring-day" name="day" type="number" min="1" max="31" defaultValue="1" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recurring-category">Kategorie</Label>
            <select
              id="recurring-category"
              name="category"
              defaultValue={isRecurring ? modal.item?.category : "Bydlení"}
              className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit">Uložit</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
