import type { Transaction } from "../contracts/ledger";
import type { TransactionFilter } from "../contracts/transfer";
import { isCalendarDate, isRecord, transactionLimits } from "./transactions";

function folded(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

function dateBound(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!isCalendarDate(value)) throw new Error("Enter a valid filter date.");
  return value;
}

function amountBound(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("Enter a valid filter amount.");
  return value;
}

function searchText(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > transactionLimits.note) throw new Error("Enter shorter search text.");
  return folded(value.trim());
}

function validated(filter: TransactionFilter): TransactionFilter {
  if (!isRecord(filter)) throw new Error("Enter valid transaction filters.");
  const startDate = dateBound(filter.startDate);
  const endDate = dateBound(filter.endDate);
  if (startDate && endDate && startDate > endDate) throw new Error("From date must come before or on Through date.");
  const minimumMinor = amountBound(filter.minimumMinor);
  const maximumMinor = amountBound(filter.maximumMinor);
  if (minimumMinor !== undefined && maximumMinor !== undefined && minimumMinor > maximumMinor) {
    throw new Error("Minimum amount must be less than or equal to Maximum amount.");
  }
  const category = filter.category;
  if (category !== undefined && category !== null && typeof category !== "string") throw new Error("Choose a valid category.");
  return { startDate, endDate, minimumMinor, maximumMinor, category, search: searchText(filter.search) };
}

function matches(row: Transaction, filter: TransactionFilter): boolean {
  const { startDate, endDate, minimumMinor, maximumMinor, category, search } = filter;
  if (startDate && row.date < startDate) return false;
  if (endDate && row.date > endDate) return false;
  if (minimumMinor !== undefined && row.amountMinor < minimumMinor) return false;
  if (maximumMinor !== undefined && row.amountMinor > maximumMinor) return false;
  if (category !== undefined && row.category !== (category ?? "")) return false;
  return !search || folded(row.payee).includes(search) || folded(row.note).includes(search);
}

/** Selects the same rows for the on-screen list and the export. */
// Time O(n plus searched text length). Space O(n) selected row references.
export function filterTransactions(rows: readonly Transaction[], filters: TransactionFilter): Transaction[] {
  const selection = validated(filters);
  return rows.filter((row) => matches(row, selection));
}
