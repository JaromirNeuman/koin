import { describe, it, expect } from "vitest";
import { catName, suggestFollowUps } from "./ai-utils"; 

describe("Koin AI Utilities", () => {

  
  describe("catName()", () => {
    it("vrátí jméno kategorie z objektu", () => {
      const input = { name: "Jídlo" };
      expect(catName(input)).toBe("Jídlo");
    });

    it("vrátí jméno kategorie z pole objektů (struktura Supabase)", () => {
      const input = [{ name: "Bydlení" }];
      expect(catName(input)).toBe("Bydlení");
    });

    it("vrátí 'Bez kategorie', pokud chybí vlastnost name", () => {
      const input = { id: 123, type: "expense" };
      expect(catName(input)).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie' pro null nebo undefined", () => {
      expect(catName(null)).toBe("Bez kategorie");
      expect(catName(undefined)).toBe("Bez kategorie");
    });

    it("vrátí 'Bez kategorie' pro prázdné pole", () => {
      expect(catName([])).toBe("Bez kategorie");
    });
  });

 
  describe("suggestFollowUps()", () => {
    it("vrátí otázky pro limity, když text obsahuje 'limit'", () => {
      const result = suggestFollowUps("Chci nastavit limit na jídlo");
      expect(result).toContain("Nastav konkrétní limity");
      expect(result).toContain("Co když limit překročím?");
    });

    it("vrátí otázky pro rozpočet, když text obsahuje 'rozpoč'", () => {
      const result = suggestFollowUps("Jaký je můj rozpočet?");
      expect(result).toContain("Uprav rozpočet na úspory 50 %");
      expect(result).toContain("Kde nejvíc utrácím?");
    });

    it("vrátí otázky pro zůstatek, když text obsahuje 'zůstat'", () => {
      const result = suggestFollowUps("Jaký mi zbývá zůstatek?");
      expect(result).toContain("Jak zrychlit růst zůstatku?");
    });

    it("vrátí výchozí otázky pro nerozpoznaný text", () => {
      const result = suggestFollowUps("Ahoj, jak se máš?");
      expect(result).toEqual(["Kde ušetřím?", "Naplánuj rozpočet", "Předpověď zůstatku"]);
    });
    
    it("funguje nezávisle na velikosti písmen (case insensitive)", () => {
      const result = suggestFollowUps("LIMITY");
      expect(result).toContain("Nastav konkrétní limity");
    });
  });

});