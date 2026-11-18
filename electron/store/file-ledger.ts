import { readFile } from "node:fs/promises";
import type { LedgerStore } from "../../application/ledger-session";
import type { Ledger } from "../../contracts/ledger";
import { newLedger } from "../../domain/ledger";
import { replaceFileAtomically } from "./atomic-file";
import { decodeLedger, encodeLedger } from "./schema";

export const LEDGER_FILENAME = "ledger.json";

/** Reads and commits the one ledger file in the application's data directory. */
export class FileLedgerStore implements LedgerStore {
  constructor(
    private readonly filename: string,
    private readonly defaultCurrency: string,
    private readonly replace?: Parameters<typeof replaceFileAtomically>[2],
  ) {}

  async read(): Promise<Ledger> {
    let contents: string;
    try {
      contents = await readFile(this.filename, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return newLedger(this.defaultCurrency);
      }
      throw new Error("The ledger could not be read.", { cause: error });
    }
    try {
      return decodeLedger(JSON.parse(contents) as unknown);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The format is invalid.";
      throw new Error("The ledger could not be read. " + detail, { cause: error });
    }
  }

  write(ledger: Ledger): Promise<void> {
    return replaceFileAtomically(this.filename, encodeLedger(ledger), this.replace);
  }
}
