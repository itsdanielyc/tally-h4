import type { Transaction } from "../contracts/ledger";
import { minorAmountText } from "./money";

export const EXPORT_FILENAME = "tally-transactions.csv";
export const exportHeaders = ["Date", "Payee", "Amount", "Category", "Note", "Tally Currency"] as const;
export const exportIndex = { category: 3, note: 4, currency: 5 } as const;
const SPREADSHEET_FORMULA = /^\s*[=+\-@]|^['\t\r\n]/u;

function quote(value: string): string {
  return '"' + value.replaceAll('"', '""') + '"';
}

function encodeText(value: string): string {
  return SPREADSHEET_FORMULA.test(value) ? "'" + value : value;
}

/** Reverses the formula protection applied to text in a Tally export. */
export function decodeExportText(value: string): string {
  return value.startsWith("'") ? value.slice(1) : value;
}

/** Writes the selected user-visible fields and currency with exact decimal amounts. */
// Time and space O(serialized text size).
export function serializeCsv(rows: readonly Transaction[], currency: string): string {
  const lines = rows.map((row) => [
    row.date, encodeText(row.payee), minorAmountText(row.amountMinor, currency),
    encodeText(row.category), encodeText(row.note), currency,
  ].map(quote).join(","));
  return [exportHeaders.map(quote).join(","), ...lines].join("\r\n") + "\r\n";
}
