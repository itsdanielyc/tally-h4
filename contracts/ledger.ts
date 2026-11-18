import type { ImportReceipt, ImportRequest, ImportReview, ImportSource } from "./import";
import type { CategoryChange, PayeeRule, PayeeRuleInput } from "./categories";

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
  readonly categories: readonly string[];
  readonly rules: readonly PayeeRule[];
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
  addCategory(this: void, name: string): Promise<Ledger>;
  renameCategory(this: void, change: CategoryChange): Promise<Ledger>;
  mergeCategory(this: void, change: CategoryChange): Promise<Ledger>;
  deleteCategory(this: void, name: string): Promise<Ledger>;
  addPayeeRule(this: void, rule: PayeeRuleInput): Promise<Ledger>;
  deletePayeeRule(this: void, id: string): Promise<Ledger>;
  applyPayeeRules(this: void): Promise<Ledger>;
}
