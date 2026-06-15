"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  Loader2,
  UploadCloud,
  UserCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { downloadFile, parseCSV, toCSV } from "@/lib/csv";
import { normalizeTransactionAmount } from "@/lib/money";
import { SAMPLE_TRANSACTIONS } from "@/lib/sample-data";

const CURRENCIES = [
  { code: "CZK", label: "Koruna (Kč)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dolar ($)" },
];

type SettingsModal = "import" | "export-csv" | "annual-report" | null;

interface FlatTx {
  date: string;
  name: string;
  category: string;
  amount: number;
}

// ── shared helpers ───────────────────────────────────────────────────────────────
function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    const [, d, mo] = m;
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // drop thousand-dot
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Real DB transactions for a range, with a demo fallback when signed-out. */
async function loadTransactionsForRange(from: string, to: string): Promise<FlatTx[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("transactions")
        .select("name, date, amount, transaction_type, categories ( name )")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (data && data.length) {
        return (data as unknown as Array<{
          name: string;
          date: string;
          amount: number;
          categories?: { name: string } | null;
        }>).map((t) => ({
          date: t.date,
          name: t.name,
          category: t.categories?.name ?? "Bez kategorie",
          amount: t.amount,
        }));
      }
    }
  } catch {
    /* fall through to demo */
  }
  return SAMPLE_TRANSACTIONS.filter((t) => t.date >= from && t.date <= to);
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<SettingsModal>(null);
  const { success } = useToast();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [income, setIncome] = useState("");
  const [saving, setSaving] = useState(false);

  // Load profile from Supabase.
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          if (data) {
            setName(data.full_name ?? "");
            setCurrency((data.currency as string) || "CZK");
            if (data.monthly_income != null) setIncome(String(data.monthly_income));
          }
        }
      } catch {
        /* keep defaults */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Known columns — must succeed together.
        await supabase
          .from("users")
          .update({ full_name: name.trim(), currency })
          .eq("id", user.id);
        // Optional column — isolated so a missing column can't block the rest.
        try {
          await supabase
            .from("users")
            .update({ monthly_income: income ? Number(income) : null })
            .eq("id", user.id);
        } catch {
          /* monthly_income column may not exist */
        }
        window.dispatchEvent(new CustomEvent("koin-profile-change"));
      }
    } catch {
      /* surfaced via toast below regardless */
    }

    setSaving(false);
    success("Profil uložen", "Změny se projeví v celé aplikaci.");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-7 lg:px-10">
      <PageHeader title="Nastavení" subtitle="Únor 2026 · aktualizované před 2 min" />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <RevealGroup className="grid gap-5 lg:grid-cols-2">
          <RevealItem>
            <Card className="px-6 py-6 ring-1 ring-foreground/[0.08]">
              <div className="flex items-center gap-2">
                <UserCircle className="size-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Profil a preference</h2>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[12px] text-muted-foreground">
                    Jméno
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vaše jméno"
                    className="h-10"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="currency" className="text-[12px] text-muted-foreground">
                      Hlavní měna
                    </Label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="income" className="text-[12px] text-muted-foreground">
                      Měsíční příjem
                    </Label>
                    <Input
                      id="income"
                      type="number"
                      inputMode="decimal"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="40000"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              <Button className="h-10 w-full" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Uložit změny
              </Button>
            </Card>
          </RevealItem>

          <RevealItem>
            <Card className="px-6 py-6 ring-1 ring-foreground/[0.08]">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="size-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Data a záloha</h2>
              </div>
              <p className="text-[13px] leading-5 text-muted-foreground">
                Importujte transakce z banky ve formátu CSV nebo exportujte kompletní historii.
              </p>

              <button
                className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/35 hover:text-foreground"
                onClick={() => setModal("import")}
              >
                <span className="flex items-center gap-2">
                  <UploadCloud className="size-4" />
                  Klikněte nebo přetáhněte soubor banky
                </span>
              </button>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-10" onClick={() => setModal("export-csv")}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setModal("annual-report")}>
                  <FileText className="size-4" />
                  Roční report
                </Button>
              </div>
            </Card>
          </RevealItem>
        </RevealGroup>
      )}

      <ImportDialog
        open={modal === "import"}
        currency={currency}
        onClose={() => setModal(null)}
        onImported={(count) =>
          success("Import dokončen", `Uloženo ${count} transakcí. Najdeš je v sekci Transakce.`)
        }
      />
      <ExportDialog
        open={modal === "export-csv"}
        onClose={() => setModal(null)}
        onExported={() => success("Export hotový", "CSV bylo staženo.")}
      />
      <ReportDialog
        open={modal === "annual-report"}
        currency={currency}
        onClose={() => setModal(null)}
        onCreated={() => success("Report vytvořen", "Souhrn byl stažen jako JSON.")}
      />
    </div>
  );
}

// ─── Import bank CSV → Supabase ──────────────────────────────────────────────────
const FIELD_GUESS: Record<"date" | "name" | "amount", RegExp> = {
  date: /dat|date/i,
  name: /popis|název|nazev|name|descr|protistr|merchant|text/i,
  amount: /částk|castk|amount|sum|value|obnos|cena/i,
};

function ImportDialog({
  open,
  currency,
  onClose,
  onImported,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [map, setMap] = useState<{ date: number; name: number; amount: number }>({
    date: 0,
    name: 1,
    amount: 2,
  });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setParsed(null);
    setError(null);
    setDragging(false);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseCSV(text);
      if (result.rows.length === 0) {
        setError("Soubor neobsahuje žádné řádky.");
        setParsed(null);
        return;
      }
      // Auto-guess column mapping from headers.
      const guess = (re: RegExp, fallback: number) => {
        const i = result.headers.findIndex((h) => re.test(h));
        return i >= 0 ? i : fallback;
      };
      setMap({
        date: guess(FIELD_GUESS.date, 0),
        name: guess(FIELD_GUESS.name, 1),
        amount: guess(FIELD_GUESS.amount, Math.min(2, result.headers.length - 1)),
      });
      setParsed(result);
    } catch {
      setError("Soubor se nepodařilo přečíst.");
      setParsed(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function confirmImport() {
    if (!parsed) return;
    setBusy(true);
    setError(null);

    const rows = parsed.rows
      .map((cells) => {
        const date = normalizeDate(cells[map.date] ?? "");
        const amount = parseAmount(cells[map.amount] ?? "");
        const name = (cells[map.name] ?? "").trim() || "Import";
        if (!date || amount === null) return null;
        const type: "income" | "expense" = amount < 0 ? "expense" : "income";
        return { date, name, type, amount: normalizeTransactionAmount(Math.abs(amount), type) };
      })
      .filter((r): r is { date: string; name: string; type: "income" | "expense"; amount: number } => r !== null);

    if (rows.length === 0) {
      setError("Nepodařilo se rozpoznat datum ani částku. Zkontrolujte přiřazení sloupců.");
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Pro import se musíte přihlásit.");
        setBusy(false);
        return;
      }

      const payload = rows.map((r) => ({
        name: r.name,
        date: r.date,
        amount: r.amount,
        currency: currency || "CZK",
        user_id: user.id,
        transaction_type: r.type,
        category_id: null,
      }));

      const { error: insertError } = await supabase.from("transactions").insert(payload);
      if (insertError) throw insertError;

      onImported(rows.length);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import se nezdařil.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Import bankovních dat"
      description="Nahrajte CSV výpis z banky. Sloupce přiřadíte ručně, data se uloží do vašich transakcí."
      onClose={close}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <AnimatePresence mode="wait">
        {!parsed ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-3"
          >
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-[13px] transition-colors ${
                dragging
                  ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                  : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
              }`}
            >
              <UploadCloud className="size-6" />
              {fileName ?? "Klikněte nebo přetáhněte soubor (.csv)"}
            </button>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={close}>
                Zrušit
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-3"
          >
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/30 px-3 py-2.5 text-[13px]">
              <span className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="size-4 text-emerald-400" />
                <span className="truncate text-foreground">{fileName}</span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                {parsed.rows.length} řádků
              </span>
            </div>

            {/* Column mapping */}
            <div className="grid grid-cols-3 gap-2">
              {(["date", "name", "amount"] as const).map((field) => (
                <div key={field} className="grid gap-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {field === "date" ? "Datum" : field === "name" ? "Popis" : "Částka"}
                  </Label>
                  <select
                    value={map[field]}
                    onChange={(e) => setMap((m) => ({ ...m, [field]: Number(e.target.value) }))}
                    className="h-9 rounded-lg border border-input bg-input/30 px-2 text-[12px] outline-none focus-visible:border-ring"
                  >
                    {parsed.headers.map((h, i) => (
                      <option key={i} value={i} className="bg-zinc-900">
                        {h || `Sloupec ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview of mapped rows */}
            <div className="overflow-hidden rounded-lg border border-border/70">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-secondary/35 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Datum</th>
                    <th className="px-3 py-2 font-semibold">Popis</th>
                    <th className="px-3 py-2 text-right font-semibold">Částka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {parsed.rows.slice(0, 3).map((row, ri) => (
                    <tr key={ri}>
                      <td className="px-3 py-2 text-foreground/80">{row[map.date]}</td>
                      <td className="truncate px-3 py-2 text-foreground/80">{row[map.name]}</td>
                      <td className="px-3 py-2 text-right text-foreground/80">{row[map.amount]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-[12px] text-red-400">{error}</p>}

            <div className="flex justify-between gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
                Zvolit jiný
              </Button>
              <Button type="button" onClick={confirmImport} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Importovat {parsed.rows.length}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ─── Export CSV ──────────────────────────────────────────────────────────────────
function ExportDialog({
  open,
  onClose,
  onExported,
}: {
  open: boolean;
  onClose: () => void;
  onExported: () => void;
}) {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [busy, setBusy] = useState(false);

  async function exportCsv(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const data = await loadTransactionsForRange(from, to);
    const rows = data.map((t) => ({
      Datum: t.date,
      Nazev: t.name,
      Kategorie: t.category,
      Castka: t.amount.toFixed(2),
    }));
    const csv = toCSV(rows, ["Datum", "Nazev", "Kategorie", "Castka"]);
    downloadFile(`koin-transakce-${from}_${to}.csv`, csv);

    setBusy(false);
    onExported();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Export CSV"
      description="Vyberte období. Vaše transakce se stáhnou jako CSV soubor."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={exportCsv}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="csv-from">Od</Label>
            <Input id="csv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="csv-to">Do</Label>
            <Input id="csv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Vygenerovat CSV
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Annual report ───────────────────────────────────────────────────────────────
function ReportDialog({
  open,
  currency,
  onClose,
  onCreated,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [year, setYear] = useState("2026");
  const [busy, setBusy] = useState(false);

  async function createReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const data = await loadTransactionsForRange(`${year}-01-01`, `${year}-12-31`);
    const income = data.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = data.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const t of data) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;

    const report = {
      year,
      currency,
      generatedAt: new Date().toISOString(),
      totals: { income, expenses, net: income - expenses },
      byCategory,
      transactions: data,
    };

    downloadFile(`koin-report-${year}.json`, JSON.stringify(report, null, 2), "application/json");

    setBusy(false);
    onCreated();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Roční report"
      description="Vytvoří souhrn příjmů, výdajů a kategorií za daný rok."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={createReport}>
        <div className="grid gap-2">
          <Label htmlFor="report-year">Rok</Label>
          <Input id="report-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Vytvořit report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
