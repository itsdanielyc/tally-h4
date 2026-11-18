import { expect, it } from "vitest";
import type { Transaction } from "../../contracts/ledger";
import { filterTransactions } from "../../domain/filters";

const rows: readonly Transaction[] = [
  { id: "first", date: "2026-11-18", category: "Food", amountMinor: -1200, payee: "Market", note: "Receipt for café" },
  { id: "second", date: "2026-11-18", category: "", amountMinor: 1200, payee: "Café refund", note: "" },
  { id: "prior", date: "2026-11-17", category: "Food", amountMinor: -1200, payee: "CAFÉ", note: "" },
];

it("matches payees and notes with inclusive date, category and signed amount filters", () => {
  expect(filterTransactions(rows, { search: "CAFÉ" }).map(({ id }) => id)).toEqual(["first", "second", "prior"]);
  expect(filterTransactions(rows, {
    search: "receipt", category: "Food", startDate: "2026-11-18", endDate: "2026-11-18",
    minimumMinor: -1200, maximumMinor: -1200,
  }).map(({ id }) => id)).toEqual(["first"]);
  expect(filterTransactions(rows, { category: null }).map(({ id }) => id)).toEqual(["second"]);
  expect(() => filterTransactions(rows, { minimumMinor: 12, maximumMinor: 11 })).toThrow("Minimum");
  expect(() => filterTransactions(rows, { startDate: "2026-02-29" })).toThrow("date");
});
