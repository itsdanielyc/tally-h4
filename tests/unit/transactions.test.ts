import { expect, it } from "vitest";
import { formatMoney, parseMinorAmount } from "../../domain/money";
import { validateTransaction } from "../../domain/transactions";

it("parses exact minor units up to the safe integer boundary", () => {
  expect(parseMinorAmount("-0.29", "USD")).toBe(-29);
  expect(parseMinorAmount("12.345", "KWD")).toBe(12345);
  expect(parseMinorAmount("90071992547409.91", "USD")).toBe(Number.MAX_SAFE_INTEGER);
  expect(() => parseMinorAmount("90071992547409.92", "USD")).toThrow("too large");
  expect(() => parseMinorAmount("12.01", "JPY")).toThrow("decimal places");
  expect(formatMoney(-29, "USD")).toBe("−$0.29");
});

it("rejects impossible dates and preserves the note verbatim", () => {
  const draft = { date: "2024-02-29", payee: "  Corner Market  ", amountMinor: -1025, note: " A, B\nC " };
  expect(validateTransaction(draft)).toEqual({
    ...draft, payee: "Corner Market", category: "",
  });
  expect(() => validateTransaction({ ...draft, date: "2026-02-29" })).toThrow("calendar date");
  expect(() => validateTransaction({ ...draft, amountMinor: 1.5 })).toThrow("minor units");
  expect(() => validateTransaction({ ...draft, payee: " " })).toThrow("payee");
});
