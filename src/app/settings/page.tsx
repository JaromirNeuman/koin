"use client";

import { useEffect, useState } from "react";
import { Download, FileText, HardDriveDownload, UploadCloud, UserCircle } from "lucide-react";
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

type SettingsModal = "save-profile" | "import" | "export-csv" | "annual-report" | null;

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    const first = categories[0];
    return typeof first === "object" && first !== null && "name" in first
      ? String(first.name)
      : "Bez kategorie";
  }

  return typeof categories === "object" && categories !== null && "name" in categories
    ? String(categories.name)
    : "Bez kategorie";
}

export default function SettingsPage() {
  const supabase = createClient();
  const { success, error: errorToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState<SettingsModal>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("CZK");

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from("users")
          .select("full_name, currency")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFullName(data.full_name || "");
          setCurrency(data.currency || "CZK");
        }
      } catch (err) {
        console.error("Chyba při načítání profilu:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [supabase]);

  function closeModal() {
    setModal(null);
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName,
          currency: currency,
        })
        .eq("id", userId);

      if (error) throw error;

      success("Profil uložen", "Změny preferencí byly úspěšně uloženy.");
      closeModal();
    } catch (err) {
      console.error("Chyba při ukládání:", err);
      errorToast("Chyba při ukládání", getErrorMessage(err, "Nepodařilo se uložit data."));
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCSV(fromDate: string, toDate: string) {
    if (!userId) return;
    setExporting(true);

    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`
          date,
          name,
          amount,
          currency,
          transaction_type,
          categories ( name )
        `)
        .eq("user_id", userId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        errorToast("Žádná data", "V zadaném časovém rozmezí nebyly nalezeny žádné transakce.");
        return;
      }

      const headers = ["Datum", "Nazev", "Castka", "Mena", "Typ", "Kategorie"];
      
      const csvRows = transactions.map((tx) => {
        const categoryName = getCategoryName(tx.categories);
        const escapedName = `"${tx.name.replace(/"/g, '""')}"`;
        const escapedCategory = `"${categoryName.replace(/"/g, '""')}"`;

        return [
          tx.date,
          escapedName,
          tx.amount,
          tx.currency,
          tx.transaction_type,
          escapedCategory
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `export-transakci_${fromDate}_to_${toDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success("Export dokončen", "Soubor CSV byl úspěšně stažen.");
      closeModal();
    } catch (err) {
      console.error("Chyba při exportu:", err);
      errorToast("Chyba exportu", getErrorMessage(err, "Nepodařilo se vygenerovat CSV."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-10">
      <PageHeader title="Nastavení" subtitle="Únor 2026 · aktualizované před 2 min" />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <RevealGroup className="grid gap-5 lg:grid-cols-2">
        <RevealItem>
        <Card className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <UserCircle className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Profil a preference</h2>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[12px] text-muted-foreground">
                Jméno
              </Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10" placeholder="Vaše jméno" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency" className="text-[12px] text-muted-foreground">
                Hlavní měna
              </Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10" placeholder="Např. CZK, EUR" />
            </div>
          </div>

          <Button className="h-10 w-full" onClick={() => setModal("save-profile")}>
            Uložit změny
          </Button>
        </Card>
        </RevealItem>

        <RevealItem>
        <Card className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <HardDriveDownload className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Data a záloha</h2>
          </div>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Importujte transakce z banky ve formátu CSV/JSON nebo exportujte kompletní historii.
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

      <SettingsDialogs 
        modal={modal} 
        onClose={closeModal} 
        onConfirmSave={handleSaveProfile}
        onConfirmExport={handleExportCSV}
        saving={saving}
        exporting={exporting}
      />
    </div>
  );
}

function SettingsDialogs({
  modal,
  onClose,
  onConfirmSave,
  onConfirmExport,
  saving,
  exporting,
}: {
  modal: SettingsModal;
  onClose: () => void;
  onConfirmSave: () => Promise<void>;
  onConfirmExport: (from: string, to: string) => Promise<void>;
  saving: boolean;
  exporting: boolean;
}) {
  const { success } = useToast();

  const MESSAGES: Record<NonNullable<SettingsModal>, { title: string; description: string }> = {
    "save-profile": { title: "Profil uložen", description: "Změny preferencí byly uloženy." },
    import: { title: "Import spuštěn", description: "Soubor banky se zpracovává." },
    "export-csv": { title: "Export připraven", description: "CSV se generuje ke stažení." },
    "annual-report": { title: "Report se vytváří", description: "Po dokončení dorazí na e-mail." },
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);

    if (modal === "export-csv") {
      const from = formData.get("from") as string;
      const to = formData.get("to") as string;
      onConfirmExport(from, to);
    } else {
      if (modal && modal !== "save-profile") {
        const msg = MESSAGES[modal];
        success(msg.title, msg.description);
      }
      onClose();
    }
  }

  return (
    <>
      <Modal
        open={modal === "save-profile"}
        title="Uložit profil"
        description="Potvrzení pro budoucí update profilu v Supabase."
        onClose={onClose}
      >
        <div className="grid gap-4">
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-3 text-[13px] text-muted-foreground">
            Změny budou uloženy do profilu uživatele a použity jako výchozí preference aplikace.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Zrušit</Button>
            <Button type="button" onClick={onConfirmSave} disabled={saving}>Potvrdit</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "import"}
        title="Import bankovních dat"
        description="Frontend počítá s CSV/JSON souborem, mapováním sloupců a následným insertem transakcí."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="bank-file">Soubor</Label>
            <Input id="bank-file" name="file" type="file" accept=".csv,.json" className="h-10 pt-2" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="import-account">Účet</Label>
            <Input id="import-account" name="account" defaultValue="Hlavní účet" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit">Importovat</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === "export-csv"}
        title="Export CSV"
        description="Backend může podle těchto filtrů vygenerovat export transakcí."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="csv-from">Od</Label>
              <Input id="csv-from" name="from" type="date" defaultValue="2026-02-01" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="csv-to">Do</Label>
              <Input id="csv-to" name="to" type="date" defaultValue="2026-02-28" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={exporting}>Zrušit</Button>
            <Button type="submit" disabled={exporting}>
              {exporting ? "Generuji..." : "Vygenerovat CSV"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === "annual-report"}
        title="Roční report"
        description="Nastavení pro PDF/CSV report, který může backend vytvořit asynchronně."
        onClose={onClose}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="report-year">Rok</Label>
            <Input id="report-year" name="year" type="number" defaultValue="2026" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-email">Poslat na e-mail</Label>
            <Input id="report-email" name="email" type="email" placeholder="vas@email.cz" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit">Vytvořit report</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
