export type SearchableTransaction = {
  name: string;
  date: string;
  categories?: { name: string } | null;
};

export function filterTransactions<T extends SearchableTransaction>(
  transactions: T[],
  query: string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  
  if (!normalizedQuery) {
    return transactions;
  }

  return transactions.filter((tx) => {
    const categoryName = tx.categories?.name || "Bez kategorie";
    return [tx.name, categoryName, tx.date].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });
}