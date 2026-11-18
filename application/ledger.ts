import type { Ledger, LedgerApi, Transaction } from "../contracts/ledger";
import { validateCurrency } from "../domain/money";
import { newestFirst, validateTransaction } from "../domain/transactions";
import { createImportCommands, type PickCsv } from "./import-commands";
import { LedgerSession, type LedgerStore } from "./ledger-session";

function view(ledger: Ledger): Ledger {
  return { ...ledger, transactions: newestFirst(ledger.transactions) };
}

function committed(ledger: Ledger): { ledger: Ledger; result: Ledger } {
  return { ledger, result: view(ledger) };
}

function replaceTransaction(ledger: Ledger, transaction: Transaction): Ledger {
  const index = ledger.transactions.findIndex(({ id }) => id === transaction.id);
  if (index < 0) throw new Error("This transaction no longer exists.");
  const transactions = [...ledger.transactions];
  transactions[index] = transaction;
  return { ...ledger, transactions };
}

/** Builds the API over an injected store, used by native IPC and browser tests. */
export function createLedgerApi(
  store: LedgerStore,
  makeId: () => string = () => crypto.randomUUID(),
  pickCsv: PickCsv = async () => null,
): LedgerApi {
  const session = new LedgerSession(store);
  return {
    ...createImportCommands(session, pickCsv, view, makeId),
    loadLedger: () => session.read(view),
    saveTransaction: (input) => session.change((ledger) => {
      const fields = validateTransaction(input);
      if (input.id === undefined) {
        const transaction = { ...fields, id: makeId() };
        return committed({ ...ledger, transactions: [...ledger.transactions, transaction] });
      }
      return committed(replaceTransaction(ledger, { ...fields, id: input.id }));
    }),
    deleteTransaction: (id) => session.change((ledger) => {
      const transactions = ledger.transactions.filter((entry) => entry.id !== id);
      if (transactions.length === ledger.transactions.length) {
        throw new Error("This transaction no longer exists.");
      }
      return committed({ ...ledger, transactions });
    }),
    setCurrency: (value) => session.change((ledger) => {
      const currency = validateCurrency(value);
      if (currency === ledger.currency) return committed(ledger);
      if (ledger.transactions.length) throw new Error("Change currency while the ledger is empty.");
      return committed({ ...ledger, currency });
    }),
  };
}
