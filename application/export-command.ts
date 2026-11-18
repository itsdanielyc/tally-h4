import type { LedgerApi } from "../contracts/ledger";
import { serializeCsv } from "../domain/csv-export";
import { filterTransactions } from "../domain/filters";
import { newestFirst } from "../domain/transactions";
import type { LedgerSession } from "./ledger-session";

export type SaveCsv = (contents: string) => Promise<string | null>;

/** Takes a consistent filtered snapshot and hands it to the platform's save picker. */
export function createExportCommand(session: LedgerSession, saveCsv: SaveCsv): LedgerApi["exportCsv"] {
  return async (filters) => {
    const { count, contents } = await session.read((ledger) => {
      const rows = filterTransactions(newestFirst(ledger.transactions), filters);
      return { count: rows.length, contents: serializeCsv(rows, ledger.currency) };
    });
    const name = await saveCsv(contents);
    return name ? { name, count } : null;
  };
}
