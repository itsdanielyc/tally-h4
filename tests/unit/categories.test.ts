import { expect, it } from "vitest";
import { applyRules, mergeCategory, removeCategory, renameCategory } from "../../domain/categories";
import { newLedger } from "../../domain/ledger";

const ledger = {
  ...newLedger("USD"),
  categories: ["Food", "Travel"],
  rules: [
    { id: "rule-1", contains: "CAFÉ", category: "Food" },
    { id: "rule-2", contains: "station", category: "Travel" },
  ],
  transactions: [
    { id: "txn-1", date: "2026-11-18", payee: "Station Café", amountMinor: -350, category: "", note: "" },
    { id: "txn-2", date: "2026-11-17", payee: "Station Café", amountMinor: -350, category: "Travel", note: "" },
  ],
};

it("applies the first case-insensitive matching rule only to uncategorised rows", () => {
  expect(applyRules(ledger).transactions.map(({ category }) => category)).toEqual(["Food", "Travel"]);
});

it("carries category references through rename and merge, and clears them on delete", () => {
  const renamed = renameCategory(applyRules(ledger), { from: "Food", to: "Dining" });
  expect(renamed.categories).toEqual(["Dining", "Travel"]);
  expect(renamed.transactions[0].category).toBe("Dining");
  const merged = mergeCategory(renamed, { from: "Dining", to: "Travel" });
  expect(merged.categories).toEqual(["Travel"]);
  expect(merged.rules.map(({ category }) => category)).toEqual(["Travel", "Travel"]);
  const deleted = removeCategory(merged, "Travel");
  expect(deleted.rules).toEqual([]);
  expect(deleted.transactions.map(({ category }) => category)).toEqual(["", ""]);
  expect(deleted.transactions.map(({ id }) => id)).toEqual(["txn-1", "txn-2"]);
});
