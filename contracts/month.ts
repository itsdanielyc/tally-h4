/** A recurring budget stored in the same minor units as transactions. */
export interface CategoryBudget {
  readonly category: string;
  readonly amountMinor: number;
}

export interface BudgetInput {
  readonly category: string;
  readonly amountMinor: number | null;
}

export interface CategoryMonth {
  readonly category: string;
  readonly spentMinor: bigint;
  readonly budgetMinor: number | null;
  readonly remainingMinor: bigint | null;
}

/** A summary can exceed the exact number range of one transaction. */
export interface MonthSummary {
  readonly month: string;
  readonly currency: string;
  readonly incomeMinor: bigint;
  readonly spendingMinor: bigint;
  readonly netMinor: bigint;
  readonly categories: readonly CategoryMonth[];
}
