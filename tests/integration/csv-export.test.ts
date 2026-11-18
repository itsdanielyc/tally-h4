import { mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLedgerApi } from "../../application/ledger";
import type { Transaction } from "../../contracts/ledger";
import { readCsvFile, writeCsvFile } from "../../electron/csv-file";
import { FileLedgerStore } from "../../electron/store/file-ledger";

function visible(row: Transaction): Omit<Transaction, "id"> {
  return { date: row.date, payee: row.payee, amountMinor: row.amountMinor, category: row.category, note: row.note };
}

it("round trips a filtered CSV with exact currency, quotes, notes and identical occurrences", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-export-"));
  try {
    const csv = join(directory, "selection.csv");
    const source = createLedgerApi(new FileLedgerStore(join(directory, "source.json"), "KWD"), undefined, undefined,
      (contents) => writeCsvFile(csv, contents));
    const selected = {
      date: "2026-11-18", payee: '=Market, "West"', amountMinor: -12345, category: "Food", note: "'Receipt\r\nSecond line",
    };
    await source.saveTransaction(selected);
    await source.saveTransaction(selected);
    await source.saveTransaction({ ...selected, payee: "A different payee", note: "Exclude me" });
    const original = (await source.loadLedger()).transactions.filter(({ note }) => note.includes("Receipt")).map(visible);
    await expect(source.exportCsv({ search: "receipt" })).resolves.toEqual({ name: "selection.csv", count: 2 });
    const output = await readFile(csv, "utf8");
    expect(output).toContain("'=Market");
    expect(output).not.toContain("Exclude me");
    const target = createLedgerApi(new FileLedgerStore(join(directory, "target.json"), "USD"), undefined, () => readCsvFile(csv));
    const captured = await target.chooseImportFile();
    const request = { token: captured!.token, mapping: captured!.suggested };
    const result = await target.confirmImport(request);
    expect(result.ledger.currency).toBe("KWD");
    expect(result.ledger.transactions.map(visible)).toEqual(original);
    expect(result.ledger.categories).toEqual(["Food"]);
    await expect(target.confirmImport(request)).resolves.toMatchObject({ imported: 0, duplicateCount: 2 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("retains the undo after an interrupted restore and consumes it after replacing the file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-undo-"));
  try {
    const file = join(directory, "ledger.json");
    let interrupted = false;
    const store = new FileLedgerStore(file, "USD", async (temporary, destination) => {
      if (interrupted) throw new Error("undo interrupted");
      await rename(temporary, destination);
    });
    const api = createLedgerApi(store);
    const original = await api.saveTransaction({ date: "2026-11-18", payee: "Coffee", amountMinor: -300 });
    const originalBytes = await readFile(file);
    const deleted = await api.deleteTransaction(original.transactions[0].id);
    const deletedBytes = await readFile(file);
    interrupted = true;
    await expect(api.undoLast()).rejects.toThrow("undo interrupted");
    await expect(api.loadLedger()).resolves.toEqual(deleted);
    expect(await readFile(file)).toEqual(deletedBytes);
    interrupted = false;
    await expect(api.undoLast()).resolves.toEqual(original);
    expect(await readFile(file)).toEqual(originalBytes);
    await expect(api.undoLast()).rejects.toThrow("no change to undo");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
