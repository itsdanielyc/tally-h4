import { expect, it } from "vitest";
import { newLedger } from "../../domain/ledger";
import { calculateMonth, shiftMonth } from "../../domain/month";
import type { Transaction } from "../../contracts/ledger";

const row = (id: string, date: string, amountMinor: number, category = ""): Transaction =>
  ({ id, date, amountMinor, category, payee: id, note: "" });

it("reconciles exact monthly spending, income and both budget directions", () => {
  const month = calculateMonth({
    ...newLedger("USD"),
    categories: ["Food", "Travel"],
    budgets: [{ category: "Food", amountMinor: 2500 }, { category: "Travel", amountMinor: 1000 }],
    transactions: [
      row("prior month", "2024-01-31", -4000, "Food"),
      row("income", "2024-02-01", 3001, "Food"),
      row("food", "2024-02-15", -1011, "Food"),
      row("travel", "2024-02-29", -1150, "Travel"),
      row("no category", "2024-02-29", -20),
      row("following month", "2024-03-01", -2000, "Food"),
    ],
  }, "2024-02");
  expect(month).toMatchObject({ incomeMinor: 3001n, spendingMinor: 2181n, netMinor: 820n });
  expect(month.categories).toEqual([
    { category: "Food", spentMinor: 1011n, budgetMinor: 2500, remainingMinor: 1489n },
    { category: "Travel", spentMinor: 1150n, budgetMinor: 1000, remainingMinor: -150n },
    { category: "", spentMinor: 20n, budgetMinor: null, remainingMinor: null },
  ]);
});

it("uses exact aggregate integers above the per-transaction maximum and rolls months across years", () => {
  const largest = Number.MAX_SAFE_INTEGER;
  const result = calculateMonth({
    ...newLedger("USD"),
    transactions: [row("a", "2026-01-01", largest), row("b", "2026-01-31", largest - 1)],
  }, "2026-01");
  expect(result.incomeMinor).toBe(18_014_398_509_481_981n);
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  expect(shiftMonth("9999-12", 1)).toBe("9999-12");
  expect(() => calculateMonth(newLedger("USD"), "2026-13")).toThrow("valid month");
});
