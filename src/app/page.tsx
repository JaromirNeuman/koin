import { type Metadata } from "next";
import Link from "next/link";
import { KoinLogo } from "@/components/koin-logo";

export const metadata: Metadata = {
  title: "Koin – nastavení",
};

const ENV_VARS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    description: "URL projektu ze Supabase → Settings → API",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "anon/public klíč ze Supabase → Settings → API",
  },
];

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg flex flex-col items-center gap-10">

        <KoinLogo size={48} />

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Koin je připraven</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Zkopíruj hodnoty ze svého{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              Supabase projektu
            </a>{" "}
            do souboru{" "}
            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">.env.local</code>.
          </p>
        </div>

        <div className="w-full bg-card border border-border rounded-2xl divide-y divide-border">
          {ENV_VARS.map(({ key, description }) => (
            <div key={key} className="px-6 py-4 space-y-0.5">
              <p className="text-sm font-mono font-medium text-foreground">{key}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Supabase nastaven? Přihlas se a začni stavět.
          </p>
          <Link
            href="/auth/login"
            className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Přejít na přihlášení →
          </Link>
        </div>

      </div>
    </main>
  );
}
