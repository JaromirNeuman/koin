import { describe, it, expect } from "vitest";
import { getCategoryIcon, getCategoryName } from "./dashboard-utils";

describe("Dashboard - Pomocné funkce", () => {

  // --- TESTY PRO PŘIŘAZOVÁNÍ IKON ---
  describe("getCategoryIcon()", () => {
    it("vrátí ikonu nákupního košíku (oranžová) pro jídlo a supermarkety", () => {
      expect(getCategoryIcon("Jídlo a pití").bg).toContain("orange");
      expect(getCategoryIcon("Nákup v LIDL").bg).toContain("orange");
      // Ověříme case-insensitivity (funguje to i na velká písmena)
      expect(getCategoryIcon("LIDL").bg).toContain("orange"); 
    });

    it("vrátí ikonu bankovky (zelená) pro příjmy", () => {
      expect(getCategoryIcon("Výplata za březen").bg).toContain("emerald");
      expect(getCategoryIcon("Příjem z brigády").bg).toContain("emerald");
    });

    it("vrátí ikonu televize (fialová) pro zábavu", () => {
      expect(getCategoryIcon("Zábava a kino").bg).toContain("purple");
      expect(getCategoryIcon("Netflix předplatné").bg).toContain("purple");
    });

    it("vrátí ikonu domečku (modrá) pro bydlení", () => {
      expect(getCategoryIcon("Nájemné").bg).toContain("blue");
    });

    it("vrátí výchozí ikonu (šedá) pro neznámé nebo obecné kategorie", () => {
      expect(getCategoryIcon("Oblečení").bg).toContain("slate");
      expect(getCategoryIcon("Neznámá transakce").bg).toContain("slate");
    });
  });

  describe("getCategoryName()", () => {
    it("vrátí název z pole objektů (častá struktura Supabase LEFT JOIN)", () => {
      const input = [{ name: "Jídlo" }];
      expect(getCategoryName(input)).toBe("Jídlo");
    });

    it("vrátí název z jednoduchého objektu", () => {
      const input = { name: "Bydlení" };
      expect(getCategoryName(input)).toBe("Bydlení");
    });

    it("vrátí 'Bez kategorie' pro prázdná nebo nevalidní data", () => {
      expect(getCategoryName(null)).toBe("Bez kategorie");
      expect(getCategoryName(undefined)).toBe("Bez kategorie");
      expect(getCategoryName([])).toBe("Bez kategorie");
      expect(getCategoryName({ id: 123 })).toBe("Bez kategorie");
    });
  });

});