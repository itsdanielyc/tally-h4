import { createLedgerApi } from "../../application/ledger";
import type { PickCsv } from "../../application/import-commands";
import type { SaveCsv } from "../../application/export-command";
import type { LedgerApi } from "../../contracts/ledger";
import { newLedger } from "../../domain/ledger";
import { pickMockCsv } from "./pick-csv";
import { saveMockCsv } from "./save-csv";

/** Starts a separate in-memory ledger for the labelled browser surface. */
export function createMock(
  currency = "USD", makeId?: () => string, pickCsv: PickCsv = pickMockCsv, saveCsv: SaveCsv = saveMockCsv,
): LedgerApi {
  let ledger = newLedger(currency);
  return createLedgerApi({
    read: async () => ledger,
    write: async (committed) => { ledger = committed; },
  }, makeId, pickCsv, saveCsv);
}
