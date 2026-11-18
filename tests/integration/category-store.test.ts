import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLedgerApi } from "../../application/ledger";
import { FileLedgerStore } from "../../electron/store/file-ledger";

it("migrates existing transaction categories and reopens rules after a rename", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-categories-"));
  try {
    const file = join(directory, "ledger.json");
    await writeFile(file, JSON.stringify({
      schema: 1, settings: { currency: "USD" },
      transactions: [{ id: "record", date: "2026-11-18", payee: "Restaurant", amountMinor: -1500, category: "Food", note: "" }],
    }));
    const ledger = createLedgerApi(new FileLedgerStore(file, "USD"));
    await expect(ledger.loadLedger()).resolves.toMatchObject({ categories: ["Food"], rules: [] });
    await ledger.addPayeeRule({ contains: "Restaurant", category: "Food" });
    const renamed = await ledger.renameCategory({ from: "Food", to: "Dining" });
    expect(renamed.transactions[0].category).toBe("Dining");
    expect(renamed.rules[0].category).toBe("Dining");
    const reopened = createLedgerApi(new FileLedgerStore(file, "GBP"));
    await expect(reopened.loadLedger()).resolves.toEqual(renamed);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
