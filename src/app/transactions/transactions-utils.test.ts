import { describe, it, expect } from "vitest";
import { filterTransactions, SearchableTransaction } from "./transactions-utils";

describe("Transakce - Vyhledávání", () => {
  const mockTransactions: SearchableTransaction[] = [
    { name: "Nákup Albert", date: "2026-02-15", categories: { name: "Potraviny" } },
    { name: "Nájem", date: "2026-02-01", categories: { name: "Bydlení" } },
    { name: "Výplata Leden", date: "2026-01-15", categories: null },
  ];

  it("vrátí všechny transakce, pokud je dotaz prázdný", () => {
    const result = filterTransactions(mockTransactions, "");
    expect(result.length).toBe(3);
  });

  it("vrátí všechny transakce, pokud dotaz obsahuje jen mezery", () => {
    const result = filterTransactions(mockTransactions, "   ");
    expect(result.length).toBe(3);
  });

  it("správně filtruje podle názvu transakce", () => {
    const result = filterTransactions(mockTransactions, "Albert");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Nákup Albert");
  });

  it("správně filtruje podle kategorie", () => {
    const result = filterTransactions(mockTransactions, "Bydlení");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Nájem");
  });

  it("správně najde transakci s chybějící kategorií (vyhledá 'Bez kategorie')", () => {
    const result = filterTransactions(mockTransactions, "bez kategorie");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Výplata Leden");
  });

  it("správně filtruje podle data", () => {
    const result = filterTransactions(mockTransactions, "2026-01");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Výplata Leden");
  });

  it("vyhledává nezávisle na velikosti písmen (case-insensitive)", () => {
    const result = filterTransactions(mockTransactions, "nÁjeM");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Nájem");
  });

  it("vrátí prázdné pole, pokud se nic nenajde", () => {
    const result = filterTransactions(mockTransactions, "Ferrari");
    expect(result.length).toBe(0);
  });
});