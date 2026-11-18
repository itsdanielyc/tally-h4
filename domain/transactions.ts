import type { Transaction } from "../contracts/ledger";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const transactionLimits = { payee: 250, category: 100, note: 4_000 } as const;

/** Narrows data from IPC or the ledger before reading object properties. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Checks the actual calendar date in the year range that the ledger stores. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = ISO_DATE.exec(value);
  if (!parts) return false;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 && leapYear ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);
  return year >= 1 && day >= 1 && day <= days;
}

function readText(value: unknown, field: string, limit: number): string {
  if (typeof value !== "string" || value.length > limit) {
    throw new Error("Enter a valid " + field + " of up to " + limit + " characters.");
  }
  return value;
}

/** Normalizes user input and verifies the ledger's date, text and integer invariants. */
export function validateTransaction(value: unknown): Omit<Transaction, "id"> {
  if (!isRecord(value)) throw new Error("Enter a transaction.");
  if (!isCalendarDate(value.date)) throw new Error("Enter a valid calendar date.");
  if (typeof value.amountMinor !== "number" || !Number.isSafeInteger(value.amountMinor)) {
    throw new Error("Amount must be a whole number of minor units.");
  }
  const payee = readText(value.payee, "payee", transactionLimits.payee).trim();
  if (!payee) throw new Error("Enter a payee.");
  return {
    date: value.date,
    payee,
    amountMinor: value.amountMinor || 0,
    category: readText(value.category ?? "", "category", transactionLimits.category).trim(),
    note: readText(value.note ?? "", "note", transactionLimits.note),
  };
}

/** Returns the latest dates first, with the most recently entered record first on ties. */
// Time O(n log n). Space O(n).
export function newestFirst(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].reverse().sort((left, right) => right.date.localeCompare(left.date));
}
