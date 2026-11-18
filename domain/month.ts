import type { Ledger } from "../contracts/ledger";
import type { CategoryMonth, MonthSummary } from "../contracts/month";
import { isCalendarDate } from "./transactions";

const MONTHS_PER_YEAR = 12;
const LAST_YEAR = 9999;
const MONTH_TEXT = /^\d{4}-\d{2}$/;

function checkedMonth(value: unknown): string {
  if (typeof value !== "string" || !MONTH_TEXT.test(value) || !isCalendarDate(value + "-01")) {
    throw new Error("Choose a valid month.");
  }
  return value;
}

/** Moves by one calendar month and keeps the result inside the ledger's date range. */
export function shiftMonth(month: string, direction: -1 | 1): string {
  const [year, number] = checkedMonth(month).split("-").map(Number);
  const index = (year - 1) * MONTHS_PER_YEAR + number - 1 + direction;
  const bounded = Math.max(0, Math.min(LAST_YEAR * MONTHS_PER_YEAR - 1, index));
  return String(Math.floor(bounded / MONTHS_PER_YEAR) + 1).padStart(4, "0") + "-" +
    String(bounded % MONTHS_PER_YEAR + 1).padStart(2, "0");
}

function categoryRows(ledger: Ledger, totals: ReadonlyMap<string, bigint>): CategoryMonth[] {
  const budgets = new Map(ledger.budgets.map((budget) => [budget.category, budget.amountMinor]));
  const names = totals.has("") ? [...ledger.categories, ""] : ledger.categories;
  return names.map((category) => {
    const spentMinor = totals.get(category) ?? 0n;
    const budgetMinor = budgets.get(category) ?? null;
    return { category, spentMinor, budgetMinor, remainingMinor: budgetMinor === null ? null : BigInt(budgetMinor) - spentMinor };
  });
}

/** Reconciles the chosen month's exact signed totals and category spending. */
// Time O(t + c + b) for transactions, categories and budgets. Space O(c + b).
export function calculateMonth(ledger: Ledger, value: string): MonthSummary {
  const month = checkedMonth(value);
  const prefix = month + "-";
  const totals = new Map<string, bigint>();
  let incomeMinor = 0n;
  let spendingMinor = 0n;
  for (const row of ledger.transactions) {
    if (!row.date.startsWith(prefix)) continue;
    const amount = BigInt(row.amountMinor);
    if (amount >= 0n) incomeMinor += amount;
    else {
      spendingMinor -= amount;
      totals.set(row.category, (totals.get(row.category) ?? 0n) - amount);
    }
  }
  return {
    month, currency: ledger.currency, incomeMinor, spendingMinor, netMinor: incomeMinor - spendingMinor,
    categories: categoryRows(ledger, totals),
  };
}
