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
