import { describe, it, expect } from "vitest";
import { validateLoginInput } from "./login-utils";

describe("Autentizace - Validační logika", () => {
  describe("validateLoginInput()", () => {
    
    it("vrátí null (úspěch) pro správně zadaná data", () => {
      expect(validateLoginInput("jan.novak@email.cz", "tajneHeslo123")).toBeNull();
    });

    it("vrátí chybu, pokud je e-mail nebo heslo prázdné", () => {
      expect(validateLoginInput("", "heslo123")).toBe("E-mail a heslo jsou povinné údaje.");
      expect(validateLoginInput("test@test.cz", "")).toBe("E-mail a heslo jsou povinné údaje.");
      expect(validateLoginInput("", "")).toBe("E-mail a heslo jsou povinné údaje.");
    });

    it("vrátí chybu pro neplatný formát e-mailu", () => {
      expect(validateLoginInput("jannovak.cz", "heslo123")).toBe("Zadejte platný formát e-mailové adresy.");
      expect(validateLoginInput("jan@novak", "heslo123")).toBe("Zadejte platný formát e-mailové adresy.");
      expect(validateLoginInput("jan novak@test.cz", "heslo123")).toBe("Zadejte platný formát e-mailové adresy.");
    });

    it("vrátí chybu, pokud je heslo kratší než 6 znaků", () => {
      expect(validateLoginInput("test@test.cz", "12345")).toBe("Heslo musí obsahovat alespoň 6 znaků.");
    });

  });
});