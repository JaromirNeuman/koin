import { describe, it, expect } from "vitest";
import { getCategoryName } from "./analytics-utils";

describe("Analytika - Pomocné funkce", () => {

  describe("getCategoryName()", () => {
    
    it("vrátí název kategorie, pokud přijde jednoduchý objekt", () => {
      const input = { name: "Potraviny" };
      expect(getCategoryName(input)).toBe("Potraviny");
    });

    it("vrátí název kategorie, pokud přijde pole objektů (častý formát ze Supabase)", () => {
      const input = [{ name: "Nájem" }];
      expect(getCategoryName(input)).toBe("Nájem");
    });

    it("vrátí 'Bez kategorie', pokud přijde null", () => {
      expect(getCategoryName(null)).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie', pokud přijde undefined", () => {
      expect(getCategoryName(undefined)).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie', pokud přijde prázdné pole", () => {
      expect(getCategoryName([])).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie', pokud objekt neobsahuje vlastnost 'name'", () => {
      const input = { id: 123, type: "expense" };
      expect(getCategoryName(input)).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie', pokud je v poli nevalidní objekt (např. null)", () => {
      const input = [null];
      expect(getCategoryName(input)).toBe("Bez kategorie");
    });

    it("zvládne převést čísla nebo jiné typy ve vlastnosti name na string", () => {
      const input = { name: 2026 };
      expect(getCategoryName(input)).toBe("2026");
    });

  });

});