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
    const empty = { transactions: [], categories: [], rules: [], budgets: [] };
    for (const api of [mock, native]) {
      await expect(api.loadLedger()).resolves.toEqual({ currency: "USD", ...empty });
      await expect(api.setCurrency("GBP")).resolves.toEqual({ currency: "GBP", ...empty });
      const transaction = { date: "2026-11-18", payee: "Market", amountMinor: -1299 };
      await expect(api.saveTransaction(transaction)).resolves.toEqual({
        currency: "GBP", ...empty, transactions: [{ ...transaction, id: "test-record", category: "", note: "" }],
      });
      await expect(api.setCurrency("EUR")).rejects.toThrow("ledger is empty");
      await expect(api.saveTransaction({ ...transaction, id: "test-record", note: "New note" })).resolves.toMatchObject({
        transactions: [{ id: "test-record", note: "New note" }],
      });
      await expect(api.deleteTransaction("test-record")).resolves.toEqual({
        currency: "GBP", ...empty, undo: { kind: "delete", token: 1 },
      });
      await expect(api.deleteTransaction("test-record")).rejects.toThrow("no longer exists");
    }
    await expect(native.loadLedger()).resolves.toEqual(await mock.loadLedger());
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
});

it("offers one undo for delete, merge and import and clears it after another effective mutation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-undo-contract-"));
  try {
    const pick = async () => ({ name: "bank.csv", contents: "Date,Payee,Amount\n2026-11-18,Rail,-1.25" });
    const mock = createMock("USD", undefined, pick);
    const native = createLedgerApi(new FileLedgerStore(join(directory, "ledger.json"), "USD"), undefined, pick);
    for (const api of [mock, native]) {
      const added = await api.saveTransaction({ date: "2026-11-18", payee: "Market", amountMinor: -212, category: "Food" });
      const deleted = await api.deleteTransaction(added.transactions[0].id);
      expect(deleted).toMatchObject({ undo: { kind: "delete" }, transactions: [] });
      await expect(api.undoLast(deleted.undo!.token)).resolves.toEqual(added);
      await expect(api.undoLast(deleted.undo!.token)).rejects.toThrow("no change to undo");
      await api.addCategory("Travel");
      await api.setBudget({ category: "Food", amountMinor: 2400 });
      await api.addPayeeRule({ contains: "MARKET", category: "Food" });
      const beforeMerge = await api.loadLedger();
      const merged = await api.mergeCategory({ from: "Food", to: "Travel" });
      expect(merged.undo?.kind).toBe("merge");
      await expect(api.undoLast(merged.undo!.token)).resolves.toEqual(beforeMerge);
      const source = await api.chooseImportFile();
      const request = { token: source!.token, mapping: source!.suggested };
      const firstImport = await api.confirmImport(request);
      expect(firstImport).toMatchObject({ imported: 1, ledger: { undo: { kind: "import" } } });
      await expect(api.undoLast(firstImport.ledger.undo!.token)).resolves.toEqual(beforeMerge);
      const secondImport = await api.confirmImport(request);
      await api.addCategory("Home");
      await expect(api.undoLast(secondImport.ledger.undo!.token)).rejects.toThrow("no change to undo");
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rejects a stale undo click queued behind an import", async () => {
  const mock = createMock("USD", undefined, async () => ({
    name: "statement.csv", contents: "Date,Payee,Amount\n2026-11-18,Imported,-1.25",
  }));
  const added = await mock.saveTransaction({ date: "2026-11-18", payee: "Deleted", amountMinor: -212 });
  const deleted = await mock.deleteTransaction(added.transactions[0].id);
  const source = await mock.chooseImportFile();
  const request = { token: source!.token, mapping: source!.suggested };
  const importing = mock.confirmImport(request);
  const stale = mock.undoLast(deleted.undo!.token);
  const guarded = expect(stale).rejects.toThrow("undo changed");
  await expect(importing).resolves.toMatchObject({ imported: 1 });
  await guarded;
  await expect(mock.loadLedger()).resolves.toMatchObject({ transactions: [{ payee: "Imported" }] });
});

it("preserves an available undo after saving an unchanged transaction", async () => {
  const api = createMock();
  const stable = await api.saveTransaction({ date: "2026-11-18", payee: "Keep", amountMinor: 500 });
  const beforeDelete = await api.saveTransaction({ date: "2026-11-19", payee: "Delete", amountMinor: -905 });
  const deleted = await api.deleteTransaction(beforeDelete.transactions[0].id);
  const unchanged = await api.saveTransaction(stable.transactions[0]);
  expect(unchanged.undo).toEqual(deleted.undo);
  await expect(api.undoLast(deleted.undo!.token)).resolves.toEqual(beforeDelete);
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
    for (const api of [mock, native]) {
      await api.addCategory("Groceries");
      await api.addPayeeRule({ contains: "MARKET", category: "Groceries" });
    }
    const source = await mock.chooseImportFile();
    await expect(native.chooseImportFile()).resolves.toEqual(source);
    const request = { token: source!.token, mapping: source!.suggested };
    const review = await mock.previewImport(request);
    expect(review).toMatchObject({ acceptedCount: 1, duplicateCount: 0, rejections: [{ line: 3 }] });
    expect(review.preview).toMatchObject([{ payee: "Market", category: "Groceries" }]);
    await expect(native.previewImport(request)).resolves.toEqual(review);
    const receipt = await mock.confirmImport(request);
    await expect(native.confirmImport(request)).resolves.toEqual(receipt);
    expect(receipt.ledger.transactions).toMatchObject([{ category: "Groceries" }]);
    await expect(native.previewImport(request)).resolves.toMatchObject({ acceptedCount: 0, duplicateCount: 1 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("saves recurring budgets and reports identical exact totals on both adapters", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-budget-contract-"));
  try {
    const file = join(directory, "ledger.json");
    const mock = createMock("USD", () => "test-record");
    const native = createLedgerApi(new FileLedgerStore(file, "USD"), () => "test-record");
    for (const api of [mock, native]) {
      await api.addCategory("Food");
      await api.setBudget({ category: "Food", amountMinor: 2000 });
      await expect(api.setCurrency("GBP")).rejects.toThrow("no budgets");
      await api.addCategory("Travel");
      await api.setBudget({ category: "Travel", amountMinor: 500 });
      await api.saveTransaction({ date: "2026-11-18", payee: "Market", amountMinor: -2900, category: "Food" });
      await api.mergeCategory({ from: "Travel", to: "Food" });
    }
    const summary = await mock.getMonth("2026-11");
    expect(summary).toMatchObject({
      spendingMinor: 2900n,
      categories: [{ category: "Food", budgetMinor: 2500, remainingMinor: -400n }],
    });
    await expect(native.getMonth("2026-11")).resolves.toEqual(summary);
    await expect(createLedgerApi(new FileLedgerStore(file, "EUR")).getMonth("2026-11")).resolves.toEqual(summary);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
