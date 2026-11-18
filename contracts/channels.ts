import type { LedgerApi } from "./ledger";

export const channels = {
  loadLedger: "tally:load-ledger",
  saveTransaction: "tally:save-transaction",
  deleteTransaction: "tally:delete-transaction",
  setCurrency: "tally:set-currency",
} satisfies Record<keyof LedgerApi, string>;
