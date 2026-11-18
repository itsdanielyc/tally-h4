import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLedgerApi } from "../../application/ledger";
import { readCsvFile } from "../../electron/csv-file";
import { FileLedgerStore } from "../../electron/store/file-ledger";

const BANK_ROW_COUNT = 2_000;
const MAX_IMPORT_MILLISECONDS = 5_000;

it("imports 2,000 real CSV rows in under five seconds and deduplicates a reimport", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-csv-"));
  try {
    const filename = join(directory, "statement.csv");
    const entries = Array.from({ length: BANK_ROW_COUNT }, (_, index) => "2026-11-18,Payee " + index + ",-12.49");
    await writeFile(filename, ["Date,Payee,Amount", ...entries].join("\n"));
    const api = createLedgerApi(new FileLedgerStore(join(directory, "ledger.json"), "USD"), undefined, () => readCsvFile(filename));
    const started = performance.now();
    const source = await api.chooseImportFile();
    expect(source).not.toBeNull();
    const request = { token: source!.token, mapping: source!.suggested };
    const preview = await api.previewImport(request);
    expect(preview.acceptedCount).toBe(BANK_ROW_COUNT);
    const result = await api.confirmImport(request);
    expect(performance.now() - started).toBeLessThan(MAX_IMPORT_MILLISECONDS);
    expect(result.imported).toBe(BANK_ROW_COUNT);
    await expect(api.confirmImport(request)).resolves.toMatchObject({ imported: 0, duplicateCount: BANK_ROW_COUNT });
    await expect(api.loadLedger()).resolves.toEqual(result.ledger);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("commits the whole accepted batch once and retains the prior bytes on an interrupted commit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-csv-atomic-"));
  try {
    const filename = join(directory, "ledger.json");
    const csv = join(directory, "batch.csv");
    await writeFile(csv, "Date,Payee,Amount\n2026-11-18,Rail,-2\n2026-11-18,Market,-5\nbad,Unreadable,8");
    let interrupted = false;
    let replacements = 0;
    const store = new FileLedgerStore(filename, "USD", async (temporary, destination) => {
      ++replacements;
      if (interrupted) throw new Error("CSV write interrupted");
      await rename(temporary, destination);
    });
    const api = createLedgerApi(store, undefined, () => readCsvFile(csv));
    await api.saveTransaction({ date: "2026-11-17", payee: "Existing", amountMinor: 456 });
    const original = await readFile(filename);
    const source = await api.chooseImportFile();
    expect(source).not.toBeNull();
    const request = { token: source!.token, mapping: source!.suggested };
    interrupted = true;
    await expect(api.confirmImport(request)).rejects.toThrow("CSV write interrupted");
    expect(await readFile(filename)).toEqual(original);
    interrupted = false;
    await expect(api.confirmImport(request)).resolves.toMatchObject({ imported: 2, rejections: [{ line: 4 }] });
    expect(replacements).toBe(3);
    expect((await api.loadLedger()).transactions).toHaveLength(3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
