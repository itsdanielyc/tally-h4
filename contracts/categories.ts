/** A rule that assigns the first matching payee substring to a category. */
export interface PayeeRule {
  readonly id: string;
  readonly contains: string;
  readonly category: string;
}

export type PayeeRuleInput = Omit<PayeeRule, "id">;

export interface CategoryChange {
  readonly from: string;
  readonly to: string;
}
