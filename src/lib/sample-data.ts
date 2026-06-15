// Shared demo dataset used by export and reports until a real backend lands.

export interface SampleTransaction {
  date: string; // ISO yyyy-mm-dd
  name: string;
  category: string;
  amount: number; // positive = income, negative = expense
}

export const SAMPLE_TRANSACTIONS: SampleTransaction[] = [
  { date: "2026-02-03", name: "Lidl", category: "Jídlo", amount: -28.5 },
  { date: "2026-02-02", name: "Výplata", category: "Příjem", amount: 3800 },
  { date: "2026-02-01", name: "Netflix", category: "Zábava", amount: -12.99 },
  { date: "2026-01-31", name: "České dráhy", category: "Doprava", amount: -18.2 },
  { date: "2026-01-29", name: "Freelance projekt", category: "Příjem", amount: 540 },
  { date: "2026-01-28", name: "Knihy Dobrovský", category: "Vzdělávání", amount: -34.9 },
  { date: "2026-01-25", name: "Nájem", category: "Bydlení", amount: -750 },
  { date: "2026-01-20", name: "Spotify", category: "Zábava", amount: -6.99 },
];
