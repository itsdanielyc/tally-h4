import type { Ledger, Transaction } from "../../contracts/ledger";
import type { PayeeRule } from "../../contracts/categories";
import type { CategoryBudget } from "../../contracts/month";
import { validateBudget } from "../../domain/budgets";
import { validateCategoryName, validateRule } from "../../domain/categories";
import { validateCurrency } from "../../domain/money";
import { isRecord, validateTransaction } from "../../domain/transactions";

const CATEGORY_SCHEMA = 2;
const CURRENT_SCHEMA = 3;
const LEGACY_SCHEMAS = [0, 1, CATEGORY_SCHEMA];

function decodeTransaction(value: unknown): Transaction {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    throw new Error("The ledger contains a transaction without an ID.");
  }
  return { ...validateTransaction(value), id: value.id };
}

/** Validates the document and converts the earlier flat-currency schema into the current model. */
// Time O(n) transactions. Space O(n) reconstructed rows and IDs.
export function decodeLedger(document: unknown): Ledger {
  if (!isRecord(document) || !Array.isArray(document.transactions)) {
    throw new Error("The ledger format is invalid.");
  }
  if (document.schema !== CURRENT_SCHEMA && !LEGACY_SCHEMAS.some((version) => version === document.schema)) {
    throw new Error("This ledger version is unsupported.");
  }
  const currency = validateCurrency(document.schema === 0
    ? document.currency
    : isRecord(document.settings) ? document.settings.currency : undefined);
  const transactions = document.transactions.map(decodeTransaction);
  if (new Set(transactions.map(({ id }) => id)).size !== transactions.length) {
    throw new Error("The ledger contains duplicate transaction IDs.");
  }
  const { categories, rules } = decodeCategoryState(document, transactions);
  return { currency, transactions, categories, rules, budgets: decodeBudgets(document, categories) };
}

function decodeRule(value: unknown, categories: readonly string[]): PayeeRule {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    throw new Error("The ledger contains a rule without an ID.");
  }
  return { ...validateRule(value, categories), id: value.id };
}

function decodeCategoryState(
  document: Record<string, unknown>, transactions: readonly Transaction[],
): Pick<Ledger, "categories" | "rules"> {
  if (document.schema !== CATEGORY_SCHEMA && document.schema !== CURRENT_SCHEMA) {
    return { categories: [...new Set(transactions.map(({ category }) => category).filter(Boolean))], rules: [] };
  }
  if (!Array.isArray(document.categories) || !Array.isArray(document.rules)) {
    throw new Error("The ledger's categories and rules are missing.");
  }
  const categories = document.categories.map(validateCategoryName);
  const known = new Set(categories);
  if (known.size !== categories.length || transactions.some(({ category }) => category && !known.has(category))) {
    throw new Error("The ledger contains invalid category references.");
  }
  const rules = document.rules.map((rule: unknown) => decodeRule(rule, categories));
  if (new Set(rules.map(({ id }) => id)).size !== rules.length) throw new Error("The ledger contains duplicate rule IDs.");
  return { categories, rules };
}

function decodeBudgets(document: Record<string, unknown>, categories: readonly string[]): CategoryBudget[] {
  if (document.schema !== CURRENT_SCHEMA) return [];
  if (!Array.isArray(document.budgets)) throw new Error("The ledger's budgets are missing.");
  const seen = new Set<string>();
  return document.budgets.map((value: unknown) => {
    const { category, amountMinor } = validateBudget(value, categories);
    if (seen.has(category) || amountMinor === null) throw new Error("The ledger contains an invalid category budget.");
    seen.add(category);
    return { category, amountMinor };
  });
}

/** Encodes the current data model as one versioned JSON document. */
export function encodeLedger(ledger: Ledger): string {
  return JSON.stringify({
    schema: CURRENT_SCHEMA, settings: { currency: ledger.currency }, transactions: ledger.transactions,
    categories: ledger.categories, rules: ledger.rules, budgets: ledger.budgets,
  }) + "\n";
}
