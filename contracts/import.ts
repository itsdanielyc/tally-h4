import type { LedgerSnapshot, Transaction } from "./ledger";

export const dateOrders = ["YMD", "DMY", "MDY"] as const;
export type DateOrder = typeof dateOrders[number];
export type CsvDelimiter = "," | ";" | "\t" | "|";

export interface CsvMapping {
  readonly date: number;
  readonly payee: number;
  readonly dateOrder: DateOrder;
  readonly amount:
    | { readonly kind: "signed"; readonly column: number }
    | { readonly kind: "split"; readonly debit: number; readonly credit: number };
}

export interface ImportSource {
  readonly token: string;
  readonly name: string;
  readonly delimiter: CsvDelimiter;
  readonly headerLine: number;
  readonly columns: readonly string[];
  readonly suggested: CsvMapping;
}

export interface ImportRequest {
  readonly token: string;
  readonly mapping: CsvMapping;
}

export interface RejectedRow {
  readonly line: number;
  readonly reason: string;
}

export interface ImportReview {
  readonly currency: string;
  readonly acceptedCount: number;
  readonly duplicateCount: number;
  readonly preview: readonly Omit<Transaction, "id">[];
  readonly rejections: readonly RejectedRow[];
}

export interface ImportReceipt {
  readonly ledger: LedgerSnapshot;
  readonly imported: number;
  readonly duplicateCount: number;
  readonly rejections: readonly RejectedRow[];
}
