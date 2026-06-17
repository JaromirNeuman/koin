import {
  ShoppingCart,
  Banknote,
  Tv2,
  Home,
  HelpCircle,
} from "lucide-react";

export function getCategoryIcon(categoryName: string) {
  const name = categoryName.toLowerCase();
  if (name.includes("jídlo") || name.includes("lidl"))
    return { icon: ShoppingCart, bg: "bg-orange-500/10 text-orange-400" };
  if (name.includes("příjem") || name.includes("výplata"))
    return { icon: Banknote, bg: "bg-emerald-500/10 text-emerald-400" };
  if (name.includes("zábava") || name.includes("netflix"))
    return { icon: Tv2, bg: "bg-purple-500/10 text-purple-400" };
  if (name.includes("bydlení") || name.includes("nájem"))
    return { icon: Home, bg: "bg-blue-500/10 text-blue-400" };
  
  return { icon: HelpCircle, bg: "bg-slate-500/10 text-slate-400" };
}

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