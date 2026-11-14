export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Groceries",
  "Rent",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Other",
] as const;

export const CATEGORY_STYLES: Record<string, string> = {
  Food: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  Travel: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  Groceries: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  Rent: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  Utilities: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  Entertainment: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
  Shopping: "bg-pink-500/12 text-pink-700 dark:text-pink-300",
  Health: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  Other: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
};
