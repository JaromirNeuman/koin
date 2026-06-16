import { describe, it, expect } from "vitest";
import { normalizeDate, parseAmount } from "./settings-utils";

describe("Nastavení a Import - Pomocné funkce", () => {

  describe("normalizeDate()", () => {
    it("zpracuje standardní ISO formát (YYYY-MM-DD)", () => {
      expect(normalizeDate("2026-02-15")).toBe("2026-02-15");
      expect(normalizeDate("2026-02-15T12:00:00Z")).toBe("2026-02-15");
    });

    it("zpracuje české formáty s tečkami (DD.MM.YYYY)", () => {
      expect(normalizeDate("15.2.2026")).toBe("2026-02-15");
      expect(normalizeDate("05.12.2026")).toBe("2026-12-05");
      expect(normalizeDate("1.1.2026")).toBe("2026-01-01");
    });

    it("zpracuje formáty s lomítky a dvoumístným rokem (DD/MM/YY)", () => {
      expect(normalizeDate("15/02/26")).toBe("2026-02-15");
      expect(normalizeDate("5/2/2026")).toBe("2026-02-05");
    });

    it("vrátí null pro neplatná nebo nesmyslná data", () => {
      expect(normalizeDate("nesmysl")).toBeNull();
      expect(normalizeDate("")).toBeNull();
    });
  });

  describe("parseAmount()", () => {
    it("zpracuje čisté číslo s desetinnou tečkou", () => {
      expect(parseAmount("1500.50")).toBe(1500.5);
    });

    it("zpracuje české číslo s desetinnou čárkou", () => {
      expect(parseAmount("1500,50")).toBe(1500.5);
    });

    it("zpracuje číslo s mezerami (oddělovače tisíců)", () => {
      expect(parseAmount("1 500 000,00")).toBe(1500000);
      expect(parseAmount("10 500.25")).toBe(10500.25);
    });

    it("odstraní měnové symboly a texty (Kč, EUR, atd.)", () => {
      expect(parseAmount("1500 Kč")).toBe(1500);
      expect(parseAmount("€ 250,50")).toBe(250.5);
      expect(parseAmount("- 100 CZK")).toBe(-100);
    });

    it("zpracuje záporná čísla (výdaje)", () => {
      expect(parseAmount("-1500,50")).toBe(-1500.5);
      expect(parseAmount("- 200")).toBe(-200);
    });

    it("vrátí null pro zcela neplatný text", () => {
      expect(parseAmount("jenom text")).toBeNull();
      expect(parseAmount("")).toBeNull();
    });
  });

});