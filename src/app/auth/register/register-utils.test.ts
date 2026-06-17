import { describe, it, expect } from "vitest";
import { getStrength, validateRegisterInput } from "./register-utils";

describe("Registrace - Logika a Validace", () => {
  
 
  describe("getStrength()", () => {
    it("vrátí 0 pro prázdné heslo", () => {
      expect(getStrength("")).toBe(0);
    });

    it("vrátí 1 pro obyčejné krátké slovo", () => {
      expect(getStrength("ahoj")).toBe(1);
    });

    it("vrátí 5 (maximum) pro supersilné heslo", () => {
      expect(getStrength("TajneHeslo123!")).toBe(5);
    });

    it("správně detekuje chybějící speciální znak", () => {
      expect(getStrength("TajneHeslo123")).toBe(4);
    });
  });

  describe("validateRegisterInput()", () => {
    it("vrátí null (úspěch) pro zcela validní data", () => {
      expect(
        validateRegisterInput("Jan Novák", "jan@novak.cz", "TajneHeslo123!", "TajneHeslo123!")
      ).toBeNull();
    });

    it("vrátí chybu, pokud chybí jméno", () => {
      expect(
        validateRegisterInput("", "jan@novak.cz", "TajneHeslo123!", "TajneHeslo123!")
      ).toBe("Vyplňte prosím všechna pole.");
    });

    it("vrátí chybu pro neplatný formát e-mailu", () => {
      expect(
        validateRegisterInput("Jan", "jannovak.cz", "TajneHeslo123!", "TajneHeslo123!")
      ).toBe("Zadejte platný formát e-mailové adresy.");
    });

    it("vrátí chybu, pokud je heslo slabé", () => {
      expect(
        validateRegisterInput("Jan", "jan@novak.cz", "slabe", "slabe")
      ).toBe("Heslo nesplňuje všechny požadavky na bezpečnost.");
    });

    it("vrátí chybu, pokud se hesla neshodují", () => {
      expect(
        validateRegisterInput("Jan", "jan@novak.cz", "TajneHeslo123!", "TajneHeslo123?")
      ).toBe("Zadaná hesla se neshodují.");
    });
  });

});