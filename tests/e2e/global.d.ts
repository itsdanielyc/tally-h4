import type { LedgerApi } from "../../contracts/ledger";

declare global {
  interface Window {
    electronBridge?: LedgerApi;
  }
}
