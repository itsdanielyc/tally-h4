import type { ImportReceipt, ImportRequest, ImportReview, ImportSource } from "./import";
import type { CategoryChange, PayeeRule, PayeeRuleInput } from "./categories";
import type { BudgetInput, CategoryBudget, MonthSummary } from "./month";
import type { ExportReceipt, TransactionFilter, UndoKind } from "./transfer";

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
  readonly budgets: readonly CategoryBudget[];
}

/** A renderer snapshot can also advertise the session's available undo. */
export interface LedgerSnapshot extends Ledger {
  readonly undo?: UndoKind;
}

/** Operations shared by the desktop bridge and the browser's in-memory backend. */
export interface LedgerApi {
  loadLedger(this: void): Promise<LedgerSnapshot>;
  saveTransaction(this: void, input: TransactionInput): Promise<LedgerSnapshot>;
  deleteTransaction(this: void, id: string): Promise<LedgerSnapshot>;
  setCurrency(this: void, currency: string): Promise<LedgerSnapshot>;
  chooseImportFile(this: void): Promise<ImportSource | null>;
  previewImport(this: void, request: ImportRequest): Promise<ImportReview>;
  confirmImport(this: void, request: ImportRequest): Promise<ImportReceipt>;
  addCategory(this: void, name: string): Promise<LedgerSnapshot>;
  renameCategory(this: void, change: CategoryChange): Promise<LedgerSnapshot>;
  mergeCategory(this: void, change: CategoryChange): Promise<LedgerSnapshot>;
  deleteCategory(this: void, name: string): Promise<LedgerSnapshot>;
  addPayeeRule(this: void, rule: PayeeRuleInput): Promise<LedgerSnapshot>;
  deletePayeeRule(this: void, id: string): Promise<LedgerSnapshot>;
  applyPayeeRules(this: void): Promise<LedgerSnapshot>;
  getMonth(this: void, month: string): Promise<MonthSummary>;
  setBudget(this: void, budget: BudgetInput): Promise<LedgerSnapshot>;
  exportCsv(this: void, filter: TransactionFilter): Promise<ExportReceipt | null>;
  undoLast(this: void): Promise<LedgerSnapshot>;
}
