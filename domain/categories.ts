import type { CategoryChange, PayeeRule, PayeeRuleInput } from "../contracts/categories";
import type { Ledger } from "../contracts/ledger";
import { isRecord, transactionLimits } from "./transactions";

function folded(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/** Ensures a category name is visible and within the transaction editor's limits. */
export function validateCategoryName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > transactionLimits.category) {
    throw new Error("Enter a category name up to " + transactionLimits.category + " characters.");
  }
  return value.trim();
}

function findCategory(categories: readonly string[], name: string): string | undefined {
  const key = folded(name);
  return categories.includes(name) ? name : categories.find((candidate) => folded(candidate) === key);
}

/** Allows the editor to select a known category or create a new category by name. */
export function resolveTransactionCategory(
  categories: readonly string[], candidate: string,
): { name: string; categories: readonly string[] } {
  if (!candidate) return { name: "", categories };
  const known = findCategory(categories, candidate);
  return known ? { name: known, categories } : { name: candidate, categories: [...categories, candidate] };
}

export function createCategory(ledger: Ledger, value: unknown): Ledger {
  const name = validateCategoryName(value);
  if (findCategory(ledger.categories, name)) throw new Error("A category with that name already exists.");
  return { ...ledger, categories: [...ledger.categories, name] };
}

function requireCategory(categories: readonly string[], name: unknown): string {
  if (typeof name !== "string" || !categories.includes(name)) throw new Error("This category no longer exists.");
  return name;
}

// Time O(t + r) transactions and rules. Space O(t + r) for the updated lists.
function reassignCategory(ledger: Ledger, from: string, to: string, categories: readonly string[]): Ledger {
  return {
    ...ledger,
    categories,
    transactions: ledger.transactions.map((entry) => entry.category === from ? { ...entry, category: to } : entry),
    rules: ledger.rules.flatMap((rule) => {
      if (rule.category !== from) return [rule];
      return to ? [{ ...rule, category: to }] : [];
    }),
  };
}

/** Renames a category and updates the ledger data that refers to the original name. */
export function renameCategory(ledger: Ledger, input: CategoryChange): Ledger {
  if (!isRecord(input)) throw new Error("Choose a category to rename.");
  const from = requireCategory(ledger.categories, input.from);
  const to = validateCategoryName(input.to);
  if (from === to) return ledger;
  if (findCategory(ledger.categories.filter((name) => name !== from), to)) {
    throw new Error("A category with that name already exists.");
  }
  return reassignCategory(ledger, from, to, ledger.categories.map((name) => name === from ? to : name));
}

/** Moves every reference to the destination and removes the merged category. */
export function mergeCategory(ledger: Ledger, input: CategoryChange): Ledger {
  if (!isRecord(input)) throw new Error("Choose two categories to merge.");
  const from = requireCategory(ledger.categories, input.from);
  const to = requireCategory(ledger.categories, input.to);
  if (from === to) throw new Error("Choose two different categories.");
  return reassignCategory(ledger, from, to, ledger.categories.filter((name) => name !== from));
}

/** Keeps the transactions and removes rule references when a category is deleted. */
export function removeCategory(ledger: Ledger, input: unknown): Ledger {
  const from = requireCategory(ledger.categories, input);
  return reassignCategory(ledger, from, "", ledger.categories.filter((name) => name !== from));
}

/** Validates rule text and resolves a category that exists in the ledger. */
export function validateRule(input: unknown, categories: readonly string[]): PayeeRuleInput {
  if (!isRecord(input) || typeof input.contains !== "string" || !input.contains.trim() ||
      input.contains.trim().length > transactionLimits.payee) {
    throw new Error("Enter payee text up to " + transactionLimits.payee + " characters.");
  }
  return { contains: input.contains.trim(), category: requireCategory(categories, input.category) };
}

/** Normalizes each rule once, keeping creation order for overlapping substrings. */
export function createRuleMatcher(rules: readonly PayeeRule[]): (payee: string) => string {
  const ordered = rules.map((rule) => ({ ...rule, contains: folded(rule.contains) }));
  return (payee) => {
    if (!ordered.length) return "";
    const text = folded(payee);
    return ordered.find((rule) => text.includes(rule.contains))?.category ?? "";
  };
}

/** Applies the same rule matcher as CSV import to current uncategorised rows. */
// Time O(t × r) substring checks. Space O(t + r).
export function applyRules(ledger: Ledger): Ledger {
  if (!ledger.rules.length) return ledger;
  const match = createRuleMatcher(ledger.rules);
  let changed = false;
  const transactions = ledger.transactions.map((entry) => {
    if (entry.category) return entry;
    const category = match(entry.payee);
    if (!category) return entry;
    changed = true;
    return { ...entry, category };
  });
  return changed ? { ...ledger, transactions } : ledger;
}
