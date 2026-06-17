export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "salary"
  | "freelance"
  | "investment"
  | "food"
  | "transport"
  | "housing"
  | "entertainment"
  | "healthcare"
  | "shopping"
  | "utilities"
  | "other";

export interface Transaction {
  id: number;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  name: string;
  category_id: number | null;
  categories?: { name: string } | null;
  date: string; // ISO 8601
  currency: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}
