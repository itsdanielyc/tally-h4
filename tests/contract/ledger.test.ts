import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLedgerApi } from "../../application/ledger";
import { FileLedgerStore } from "../../electron/store/file-ledger";
import { createMock } from "../../src/mock/backend";

it("keeps the native ledger and browser mock aligned through CRUD and currency settings", async () => {
  const profile = await mkdtemp(join(tmpdir(), "tally-contract-"));
  try {
    const mock = createMock("USD", () => "test-record");
    const native = createLedgerApi(new FileLedgerStore(join(profile, "ledger.json"), "USD"), () => "test-record");
    for (const api of [mock, native]) {
      await expect(api.loadLedger()).resolves.toEqual({ currency: "USD", transactions: [] });
      await expect(api.setCurrency("GBP")).resolves.toEqual({ currency: "GBP", transactions: [] });
      const transaction = { date: "2026-11-18", payee: "Market", amountMinor: -1299 };
      await expect(api.saveTransaction(transaction)).resolves.toEqual({
        currency: "GBP", transactions: [{ ...transaction, id: "test-record", category: "", note: "" }],
      });
      await expect(api.setCurrency("EUR")).rejects.toThrow("ledger is empty");
      await expect(api.saveTransaction({ ...transaction, id: "test-record", note: "New note" })).resolves.toMatchObject({
        transactions: [{ id: "test-record", note: "New note" }],
      });
      await expect(api.deleteTransaction("test-record")).resolves.toEqual({ currency: "GBP", transactions: [] });
      await expect(api.deleteTransaction("test-record")).rejects.toThrow("no longer exists");
    }
    await expect(native.loadLedger()).resolves.toEqual(await mock.loadLedger());
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
});

it("returns the same source, review and commit result for mock and native CSV commands", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-csv-contract-"));
  try {
    const file = async () => ({
      name: "statement.csv", contents: "Date,Payee,Amount\n2026-11-18,Market,-12.10\ninvalid,Bad,5",
    });
    const nextId = (): (() => string) => {
      let number = 0;
      return () => "csv-" + ++number;
    };
    const mock = createMock("USD", nextId(), file);
    const native = createLedgerApi(new FileLedgerStore(join(directory, "ledger.json"), "USD"), nextId(), file);
    const source = await mock.chooseImportFile();
    await expect(native.chooseImportFile()).resolves.toEqual(source);
    const request = { token: source!.token, mapping: source!.suggested };
    const review = await mock.previewImport(request);
    expect(review).toMatchObject({ acceptedCount: 1, duplicateCount: 0, rejections: [{ line: 3 }] });
    await expect(native.previewImport(request)).resolves.toEqual(review);
    const receipt = await mock.confirmImport(request);
    await expect(native.confirmImport(request)).resolves.toEqual(receipt);
    await expect(native.previewImport(request)).resolves.toMatchObject({ acceptedCount: 0, duplicateCount: 1 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
