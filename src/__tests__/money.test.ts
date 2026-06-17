import { describe, it, expect } from "vitest";
import { formatMoney, normalizeTransactionAmount } from "@/lib/money";

describe("formatMoney", () => {
  it("formats positive CZK amount", () => {
    const result = formatMoney(1500, "CZK");
    expect(result).toContain("1");
    expect(result).toContain("500");
    expect(result).toMatch(/Kč|CZK/);
  });

  it("formats zero without sign by default", () => {
    const result = formatMoney(0, "CZK");
    expect(result).not.toMatch(/^\+/);
    expect(result).not.toMatch(/^-/);
  });

  it("sign=never (default) always strips sign", () => {
    expect(formatMoney(-500, "CZK", { sign: "never" })).not.toMatch(/^-/);
    expect(formatMoney(500, "CZK", { sign: "never" })).not.toMatch(/^\+/);
  });

  it("sign=auto adds + for positive amounts", () => {
    const result = formatMoney(500, "CZK", { sign: "auto" });
    expect(result.startsWith("+")).toBe(true);
  });

  it("sign=auto adds - for negative amounts", () => {
    const result = formatMoney(-500, "CZK", { sign: "auto" });
    expect(result.startsWith("-")).toBe(true);
  });

  it("sign=auto returns no sign for zero", () => {
    const result = formatMoney(0, "CZK", { sign: "auto" });
    expect(result).not.toMatch(/^[+-]/);
  });

  it("formats EUR amount using EUR currency", () => {
    const result = formatMoney(99, "EUR");
    expect(result).toMatch(/€|EUR/);
  });

  it("formats USD amount", () => {
    const result = formatMoney(1234.56, "USD");
    expect(result).toMatch(/\$|USD/);
  });

  it("uses absolute value for display regardless of sign flag", () => {
    const neg = formatMoney(-1234, "CZK", { sign: "never" });
    const pos = formatMoney(1234, "CZK", { sign: "never" });
    expect(neg).toBe(pos);
  });
});

describe("normalizeTransactionAmount", () => {
  it("income stays positive", () => {
    expect(normalizeTransactionAmount(500, "income")).toBe(500);
  });

  it("income negatives are flipped to positive", () => {
    expect(normalizeTransactionAmount(-500, "income")).toBe(500);
  });

  it("expense is always negative", () => {
    expect(normalizeTransactionAmount(300, "expense")).toBe(-300);
  });

  it("expense already negative stays negative", () => {
    expect(normalizeTransactionAmount(-300, "expense")).toBe(-300);
  });

  it("zero is zero for both types", () => {
    expect(normalizeTransactionAmount(0, "income")).toBe(0);
    expect(normalizeTransactionAmount(0, "expense")).toBe(-0);
  });
});
