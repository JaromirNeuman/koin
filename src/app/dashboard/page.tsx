import { type Metadata } from "next";
import { KoinLogo } from "@/components/koin-logo";

export const metadata: Metadata = {
  title: "Dashboard – Koin",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
      <KoinLogo size={40} className="text-muted-foreground" />
      <p className="text-muted-foreground text-sm">Dashboard – bude brzy</p>
    </main>
  );
}
