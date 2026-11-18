import { createLedgerApi } from "../../application/ledger";
import type { Ledger, LedgerApi } from "../../contracts/ledger";

/** Starts a separate in-memory ledger for the labelled browser surface. */
export function createMock(currency = "USD", makeId?: () => string): LedgerApi {
  let ledger: Ledger = { currency, transactions: [] };
  return createLedgerApi({
    read: async () => ledger,
    write: async (committed) => { ledger = committed; },
  }, makeId);
}
