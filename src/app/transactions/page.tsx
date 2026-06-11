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
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const RECURRING = [
  { name: "Nájem", amount: 750, interval: "Měsíčně", category: "Bydlení" },
  { name: "Netflix", amount: 12.99, interval: "Měsíčně", category: "Zábava" },
  { name: "Spotify", amount: 6.99, interval: "Měsíčně", category: "Zábava" },
];

type DbTransaction = {
  id: number;
  name: string;
  amount: number;
  date: string;
  currency: string;
  user_id: string;
  transaction_type: string; // 'income' | 'expense'
  category_id: number | null;
  categories?: { name: string } | null;
};

type DbCategory = {
  id: string | number;
  name: string;
};

type Recurring = (typeof RECURRING)[number];
type ModalState =
  | { type: "transaction"; transaction?: DbTransaction }
  | { type: "category"; category?: DbCategory }
  | { type: "delete-category"; category: DbCategory }
  | { type: "recurring"; item?: Recurring }
  | null;

function formatAmount(amount: number) {
  return `${amount > 0 ? "+" : "-"} €${Math.abs(amount).toLocaleString("cs", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransactionsPage() {
  const supabase = createClient();
  const { success, error: errorToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [transactions, setTransactions] = useState<DbTransaction[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Počet zobrazených položek na jedné stránce

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) setCategories(data);
    } catch (err: any) {
      console.error("Chyba při načítání kategorií:", err);
    }
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          name,
          amount,
          date,
          currency,
          user_id,
          transaction_type,
          category_id,
          categories ( name )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      if (data) setTransactions(data as unknown as DbTransaction[]);
    } catch (err: any) {
      console.error("Chyba při načítání transakcí:", err);
      errorToast("Chyba stahování", "Nepodařilo se načíst transakce.");
    }
  }

  useEffect(() => {
  async function initPage() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await Promise.all([fetchCategories(), fetchTransactions()]);
    }
    setLoading(false);
  }
  initPage();
}, []);

  async function handleInlineAddCategory() {
    if (!newCategoryName.trim()) return;
    setActionLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Uživatel není přihlášen.");

      const { error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName.trim(), user_id: user.id });

      if (error) throw error;

      success("Kategorie přidána", `Kategorie „${newCategoryName}“ byla úspěšně vytvořena.`);
      setNewCategoryName("");
      await fetchCategories();
    } catch (err: any) {
      errorToast("Chyba při ukládání", err.message || "Nepodařilo se přidat kategorii.");
    } finally {
      setActionLoading(false);
    }
  }

  const searchedTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return transactions;

    return transactions.filter((tx) => {
      const categoryName = tx.categories?.name || "Bez kategorie";
      return [tx.name, categoryName, tx.date].some((value) =>
        value.toLowerCase().includes(normalized)
      );
    });
  }, [query, transactions]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(searchedTransactions.length / ITEMS_PER_PAGE));
  }, [searchedTransactions, ITEMS_PER_PAGE]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return searchedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [searchedTransactions, currentPage, ITEMS_PER_PAGE]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  function closeModal() {
    setModal(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-7 lg:px-10">
      <PageHeader
        title="Transakce"
        subtitle="Únor 2026 · aktualizované před 2 min"
        actions={
          <Button
            className="h-9 gap-2 bg-primary px-3 text-primary-foreground"
            onClick={() => setModal({ type: "transaction" })}
          >
            <Plus className="size-4" />
            Přidat transakci
          </Button>
        }
      />

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
              <p className="text-[12px] text-muted-foreground">Zobrazeno {searchedTransactions.length} z {transactions.length} záznamů</p>
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
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-4 py-3.5 text-muted-foreground">{new Date(tx.date).toLocaleDateString("cs")}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <button className="hover:underline" onClick={() => setModal({ type: "transaction", transaction: tx })}>
                      {tx.name}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-secondary/70 px-2.5 py-1 text-[12px] text-secondary-foreground">
                      {tx.categories?.name || "Bez kategorie"}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3.5 text-right font-semibold tabular-nums", tx.amount > 0 ? "text-emerald-400" : "text-red-400")}>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {tx.amount > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                      {formatAmount(tx.amount)}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">Nenalezeny žádné transakce.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Button 
            variant="secondary" 
            size="icon-sm" 
            aria-label="Předchozí stránka"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>       
          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1;
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "secondary"}
                size="icon-sm"
                aria-label={`Stránka ${page}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
          
          <Button 
            variant="secondary" 
            size="icon-sm" 
            aria-label="Další stránka"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
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
            {categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-1.5 text-[12px]"
              >
                <button onClick={() => setModal({ type: "category", category })}>{category.name}</button>
                <button onClick={() => setModal({ type: "delete-category", category })} aria-label={`Smazat ${category.name}`}>
                  <X className="size-3.5 text-red-400" />
                </button>
              </span>
            ))}
            {categories.length === 0 && (
                    <p className="text-[12px] text-muted-foreground py-1">Žádné kategorie nenalezeny. Vytvoř si první.</p>
            )}
          </div>
          <div className="flex gap-2">
                  <Input 
                    className="h-10" 
                    placeholder="Nová kategorie..." 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={actionLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleInlineAddCategory()}
                  />
                  <Button 
                    className="h-10 w-12" 
                    aria-label="Přidat kategorii" 
                    onClick={handleInlineAddCategory}
                    disabled={actionLoading || !newCategoryName.trim()}
                  >
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

      <TransactionDialogs 
        modal={modal} 
        onClose={closeModal} 
        onRefreshCategories={fetchCategories} 
        onRefreshTransactions={fetchTransactions}
        categories={categories} 
      />
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
  onRefreshCategories,
  onRefreshTransactions,
  categories,
}: {
  modal: ModalState;
  onClose: () => void;
  onRefreshCategories: () => Promise<void>;
  onRefreshTransactions: () => Promise<void>;
  categories: DbCategory[];
}) {
  const supabase = createClient();
  const { success, error: errorToast } = useToast();

  const isTransaction = modal?.type === "transaction";
  const isCategory = modal?.type === "category";
  const isDeleteCategory = modal?.type === "delete-category";
  const isRecurring = modal?.type === "recurring";

  const [editCategoryName, setEditCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (modal?.type === "category" && modal.category) {
      setEditCategoryName(modal.category.name);
    } else {
      setEditCategoryName("");
    }
  }, [modal]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modal?.type === "category") {
        if (modal.category) {
          const { error } = await supabase
            .from("categories")
            .update({ name: editCategoryName.trim() })
            .eq("id", modal.category.id);

          if (error) throw error;
          success("Kategorie upravena", "Změna byla úspěšně uložena.");
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Uživatel není přihlášen.");

          const { error } = await supabase
            .from("categories")
            .insert({ name: editCategoryName.trim(), user_id: user.id });

          if (error) throw error;
          success("Kategorie přidána", "Nová kategorie byla uložena.");
        }
        
        await onRefreshCategories();
        onClose();
      }
      
     if (modal?.type === "transaction") {
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const date = formData.get("date") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const categoryId = formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null;

        if (!name.trim() || !date || isNaN(amount)) {
          throw new Error("Prosím vyplňte všechna povinná pole správně.");
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Uživatel není přihlášen.");

        const transactionType = amount >= 0 ? "income" : "expense";

        if (modal.transaction) {
          const { error } = await supabase
            .from("transactions")
            .update({
              name: name.trim(),
              date,
              amount,
              transaction_type: transactionType,
              category_id: categoryId
            })
            .eq("id", modal.transaction.id);

          if (error) throw error;
          success("Transakce upravena", "Změny byly uloženy do databáze.");
        } else {
          const { error } = await supabase
            .from("transactions")
            .insert({
              name: name.trim(),
              date,
              amount,
              currency: "CZK",
              user_id: user.id,
              transaction_type: transactionType,
              category_id: categoryId
            });

          if (error) throw error;
          success("Transakce přidána", "Nová transakce byla uložena.");
        }

        await onRefreshTransactions();
        onClose();
      } else if (modal?.type === "recurring") {
        success(modal.item ? "Trvalý příkaz upraven" : "Trvalý příkaz přidán");
        onClose();
      }
    } catch (err: any) {
      errorToast("Chyba při ukládání", err.message || "Operace se nezdařila.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    if (modal?.type !== "delete-category") return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", modal.category.id);

      if (error) throw error;

      success("Kategorie smazána", `„${modal.category.name}“ byla úspěšně odebrána.`);
      await onRefreshCategories();
      onClose();
    } catch (err: any) {
      errorToast("Chyba při mazání", err.message || "Nepodařilo se smazat kategorii.");
    } finally {
      setSubmitting(false);
    }
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
            <Input 
              id="transaction-name" 
              name="name" 
              required 
              defaultValue={isTransaction ? modal.transaction?.name : ""} 
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transaction-date">Datum</Label>
              <Input 
                id="transaction-date" 
                name="date" 
                type="date" 
                required 
                defaultValue={isTransaction ? modal.transaction?.date : "2026-02-03"} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-amount">Částka</Label>
              <Input
                id="transaction-amount"
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={isTransaction ? modal.transaction?.amount : ""}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transaction-category">Kategorie</Label>
            <select
              id="transaction-category"
              name="category_id"
              defaultValue={isTransaction ? (modal.transaction?.category_id ?? "") : ""}
              className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Bez kategorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
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
            <Input 
              id="category-name" 
              value={editCategoryName} 
              onChange={(e) => setEditCategoryName(e.target.value)} 
              disabled={submitting}
              placeholder="Např. Nákupy, Cestování..."
            />
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
          <Button type="button" variant="destructive" onClick={handleDeleteCategory} disabled={submitting}>
            {submitting ? "Mažu..." : "Smazat"}
          </Button>
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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
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
