export interface Saving {
  id: string;
  title: string;
  currentPrice: number;
  oldPrice: number;
  category: string;
  createdAt: Date;
}

export type SavingCategory = 
  | "Food & Dining"
  | "Shopping"
  | "Bills & Utilities"
  | "Transportation"
  | "Entertainment"
  | "Health & Fitness"
  | "Travel"
  | "Education"
  | "Other";

export const SAVING_CATEGORIES: SavingCategory[] = [
  "Food & Dining",
  "Shopping",
  "Bills & Utilities",
  "Transportation",
  "Entertainment",
  "Health & Fitness",
  "Travel",
  "Education",
  "Other",
];
