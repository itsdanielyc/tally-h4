import type { Ledger, Transaction } from "../../contracts/ledger";
import { validateCurrency } from "../../domain/money";
import { isRecord, validateTransaction } from "../../domain/transactions";

const CURRENT_SCHEMA = 1;

function decodeTransaction(value: unknown): Transaction {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    throw new Error("The ledger contains a transaction without an ID.");
  }
  return { ...validateTransaction(value), id: value.id };
}

/** Validates the document and converts the earlier flat-currency schema into the current model. */
// Time O(n) transactions. Space O(n) reconstructed rows and IDs.
export function decodeLedger(document: unknown): Ledger {
  if (!isRecord(document) || !Array.isArray(document.transactions)) {
    throw new Error("The ledger format is invalid.");
  }
  if (document.schema !== 0 && document.schema !== CURRENT_SCHEMA) {
    throw new Error("This ledger version is unsupported.");
  }
  const currency = validateCurrency(document.schema === 0
    ? document.currency
    : isRecord(document.settings) ? document.settings.currency : undefined);
  const transactions = document.transactions.map(decodeTransaction);
  if (new Set(transactions.map(({ id }) => id)).size !== transactions.length) {
    throw new Error("The ledger contains duplicate transaction IDs.");
  }
  return { currency, transactions };
}

/** Encodes the current data model as one versioned JSON document. */
export function encodeLedger(ledger: Ledger): string {
  return JSON.stringify({
    schema: CURRENT_SCHEMA, settings: { currency: ledger.currency }, transactions: ledger.transactions,
  }) + "\n";
}
