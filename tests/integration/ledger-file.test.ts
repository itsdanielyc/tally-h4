import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createLedgerApi } from "../../application/ledger";
import { FileLedgerStore } from "../../electron/store/file-ledger";

let directory: string;
let file: string;
const transaction = { date: "2026-11-18", payee: "Corner Market", amountMinor: -1025 };

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "tally-store-"));
  file = join(directory, "ledger.json");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it("migrates an older ledger and serializes overlapping saves", async () => {
  await writeFile(file, JSON.stringify({ schema: 0, currency: "USD", transactions: [] }));
  const ledger = createLedgerApi(new FileLedgerStore(file, "EUR"));
  await expect(ledger.loadLedger()).resolves.toMatchObject({ currency: "USD", transactions: [] });
  await Promise.all([
    ledger.saveTransaction(transaction),
    ledger.saveTransaction({ ...transaction, payee: "Rail fare" }),
  ]);
  const reopened = createLedgerApi(new FileLedgerStore(file, "EUR"));
  await expect(reopened.loadLedger()).resolves.toMatchObject({
    currency: "USD", transactions: [{ payee: "Rail fare" }, { payee: "Corner Market" }],
  });
  expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({ schema: 3 });
});

it("keeps the live ledger byte for byte when replacement fails", async () => {
  let stopBeforeReplace = false;
  const store = new FileLedgerStore(file, "USD", async (temporary, destination) => {
    if (stopBeforeReplace) throw new Error("simulated interruption before replace");
    await rename(temporary, destination);
  });
  const ledger = createLedgerApi(store);
  const committed = await ledger.saveTransaction(transaction);
  const written = await readFile(file);
  stopBeforeReplace = true;
  await expect(ledger.saveTransaction({ ...transaction, payee: "Rail fare" }))
    .rejects.toThrow("simulated interruption before replace");
  expect(await readFile(file)).toEqual(written);
  expect(await readdir(directory)).toEqual(["ledger.json"]);
  await expect(createLedgerApi(new FileLedgerStore(file, "EUR")).loadLedger()).resolves.toEqual(committed);
});

it("keeps unreadable contents in place instead of opening a blank ledger", async () => {
  await writeFile(file, "{broken");
  const ledger = createLedgerApi(new FileLedgerStore(file, "USD"));
  await expect(ledger.saveTransaction(transaction)).rejects.toThrow("ledger could not be read");
  expect(await readFile(file, "utf8")).toBe("{broken");
});
