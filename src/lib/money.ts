export type CurrencyCode = "CZK" | "EUR" | "USD" | (string & {});

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "CZK",
  options?: { sign?: "auto" | "never" },
) {
  const sign = options?.sign ?? "never";
  const value = Math.abs(amount);
  const formatted = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

  if (sign === "never") return formatted;
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export function normalizeTransactionAmount(
  amount: number,
  type: "income" | "expense",
) {
  const value = Math.abs(amount);
  return type === "income" ? value : -value;
}
