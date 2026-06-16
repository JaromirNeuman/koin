export function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    const first = categories[0];
    return typeof first === "object" && first !== null && "name" in first
      ? String(first.name)
      : "Bez kategorie";
  }

  return typeof categories === "object" &&
    categories !== null &&
    "name" in categories
    ? String(categories.name)
    : "Bez kategorie";
}