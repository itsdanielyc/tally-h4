import type { Ledger } from "../contracts/ledger";

/** Constructs an empty ledger for persistence and the labelled browser backend. */
export function newLedger(currency: string): Ledger {
  return { currency, transactions: [], categories: [], rules: [] };
}
