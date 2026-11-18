import type { ImportReceipt, ImportRequest, ImportReview, ImportSource } from "./import";

/** The values required to record a transaction plus its optional details. */
export interface TransactionInput {
  readonly id?: string;
  readonly date: string;
  readonly payee: string;
  readonly amountMinor: number;
  readonly category?: string;
  readonly note?: string;
}

/** A committed transaction. Positive amounts are income and negative amounts are spending. */
export interface Transaction {
  readonly id: string;
  readonly date: string;
  readonly payee: string;
  readonly amountMinor: number;
  readonly category: string;
  readonly note: string;
}

/** The committed ledger and its one currency. */
export interface Ledger {
  readonly currency: string;
  readonly transactions: readonly Transaction[];
}

/** Operations shared by the desktop bridge and the browser's in-memory backend. */
export interface LedgerApi {
  loadLedger(this: void): Promise<Ledger>;
  saveTransaction(this: void, input: TransactionInput): Promise<Ledger>;
  deleteTransaction(this: void, id: string): Promise<Ledger>;
  setCurrency(this: void, currency: string): Promise<Ledger>;
  chooseImportFile(this: void): Promise<ImportSource | null>;
  previewImport(this: void, request: ImportRequest): Promise<ImportReview>;
  confirmImport(this: void, request: ImportRequest): Promise<ImportReceipt>;
}
