import type { LedgerApi } from "./ledger";

export const channels = {
  loadLedger: "tally:load-ledger",
  saveTransaction: "tally:save-transaction",
  deleteTransaction: "tally:delete-transaction",
  setCurrency: "tally:set-currency",
  chooseImportFile: "tally:choose-import-file",
  previewImport: "tally:preview-import",
  confirmImport: "tally:confirm-import",
  addCategory: "tally:add-category",
  renameCategory: "tally:rename-category",
  mergeCategory: "tally:merge-category",
  deleteCategory: "tally:delete-category",
  addPayeeRule: "tally:add-payee-rule",
  deletePayeeRule: "tally:delete-payee-rule",
  applyPayeeRules: "tally:apply-payee-rules",
} satisfies Record<keyof LedgerApi, string>;
