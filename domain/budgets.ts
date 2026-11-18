import type { BudgetInput, CategoryBudget } from "../contracts/month";
import type { Ledger } from "../contracts/ledger";
import { isRecord } from "./transactions";

/** Validates a nonnegative recurring limit or the explicit request to remove it. */
export function validateBudget(input: unknown, categories: readonly string[]): BudgetInput {
  if (!isRecord(input) || typeof input.category !== "string" || !categories.includes(input.category)) {
    throw new Error("Choose an existing category for this budget.");
  }
  const amount = input.amountMinor;
  if (amount !== null && (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0)) {
    throw new Error("Enter a nonnegative budget amount.");
  }
  return { category: input.category, amountMinor: amount };
}

/** Replaces one category limit while preserving the other limits. */
export function setBudget(ledger: Ledger, input: BudgetInput): Ledger {
  const { category, amountMinor } = validateBudget(input, ledger.categories);
  const previous = ledger.budgets.find((budget) => budget.category === category)?.amountMinor ?? null;
  if (previous === amountMinor) return ledger;
  const others = ledger.budgets.filter((budget) => budget.category !== category);
  return { ...ledger, budgets: amountMinor === null ? others : [...others, { category, amountMinor }] };
}

/** Carries a renamed limit forward, combines merged limits, or removes a deleted limit. */
export function moveCategoryBudget(budgets: readonly CategoryBudget[], from: string, to: string): readonly CategoryBudget[] {
  const source = budgets.find((budget) => budget.category === from);
  if (!source) return budgets;
  if (!to) return budgets.filter((budget) => budget.category !== from);
  const destination = budgets.find((budget) => budget.category === to);
  const amountMinor = source.amountMinor + (destination?.amountMinor ?? 0);
  if (!Number.isSafeInteger(amountMinor)) throw new Error("The combined budget is too large.");
  return [...budgets.filter(({ category }) => category !== from && category !== to), { category: to, amountMinor }];
}
