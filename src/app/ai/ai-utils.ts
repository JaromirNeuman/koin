// ─── Contextual follow-up suggestions ───────────────────────────────────────────
export function suggestFollowUps(text: string): string[] {
  const t = text.toLowerCase();
  if (t.includes("limit"))
    return [
      "Nastav konkrétní limity",
      "Kolik ušetřím za 3 měsíce?",
      "Co když limit překročím?",
    ];
  if (t.includes("rozpoč"))
    return [
      "Uprav rozpočet na úspory 50 %",
      "Přidej rezervu na auto",
      "Kde nejvíc utrácím?",
    ];
  if (t.includes("zůstat") || t.includes("předpov") || t.includes("březn"))
    return ["Jak zrychlit růst zůstatku?", "Naplánuj rozpočet", "Kde ušetřím?"];
  return ["Kde ušetřím?", "Naplánuj rozpočet", "Předpověď zůstatku"];
}

export function catName(categories: unknown): string {
  if (Array.isArray(categories)) {
    const f = categories[0];
    return f && typeof f === "object" && "name" in f ? String(f.name) : "Bez kategorie";
  }
  return categories && typeof categories === "object" && "name" in categories
    ? String((categories as { name: string }).name)
    : "Bez kategorie";
}