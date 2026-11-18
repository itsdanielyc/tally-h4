import { describe, expect, it } from "vitest";
import { parseCsvDocument } from "../../domain/csv-document";
import { prepareImport } from "../../domain/import";
import { newLedger } from "../../domain/ledger";

describe("bank CSV parsing", () => {
  it("detects a header past preamble and preserves quoted separators, newlines and physical line numbers", () => {
    const document = parseCsvDocument([
      "\uFEFFLedger statement",
      "Transaction Date;Narrative;Debit;Credit",
      '18/11/2026;"Corner; ""Market""',
      'annex";"1.234,56";',
      "31/02/2026;Bad day;9;",
      '17/11/2026;Malformed;"12"suffix;',
      "17/11/2026;Salary;;3000",
    ].join("\r\n"));
    expect(document).toMatchObject({ delimiter: ";", headerLine: 2 });
    const mapping = { ...document.suggested, dateOrder: "DMY" as const };
    const prepared = prepareImport(document, mapping, newLedger("EUR"));
    expect(prepared.accepted).toMatchObject([
      { date: "2026-11-18", payee: 'Corner; "Market"\r\nannex', amountMinor: -123456 },
      { date: "2026-11-17", payee: "Salary", amountMinor: 300000 },
    ]);
    expect(prepared.review.rejections).toMatchObject([{ line: 5 }, { line: 6 }]);
  });

  it("handles grouped signed amounts and checks duplicates against the committed ledger", () => {
    const document = parseCsvDocument('When,Shop,Net\n03/04/2026,Market,"(1,024.30)"\n03/04/2026,Market,"(1,024.30)"\n02/04/2026,Rail,12.50');
    const mapping = { ...document.suggested, dateOrder: "MDY" as const };
    const empty = newLedger("USD");
    const fresh = prepareImport(document, mapping, empty);
    expect(fresh.accepted).toHaveLength(3);
    expect(fresh.accepted[0]).toMatchObject({ date: "2026-03-04", amountMinor: -102430 });
    const existing = { ...fresh.accepted[0], id: "market" };
    const second = prepareImport(document, mapping, { ...empty, transactions: [existing] });
    expect(second.review.duplicateCount).toBe(2);
    expect(second.accepted).toMatchObject([{ payee: "Rail", amountMinor: 1250 }]);
  });

  it("rejects conflicting column mappings and split rows with both directions", () => {
    const document = parseCsvDocument("Date,Payee,Debit,Credit\n2026-11-18,Market,4,8");
    const empty = newLedger("USD");
    const prepared = prepareImport(document, document.suggested, empty);
    expect(prepared.review.rejections[0]?.reason).toContain("both a debit and a credit");
    expect(() => prepareImport(document, { ...document.suggested, payee: document.suggested.date }, empty))
      .toThrow("different columns");
  });

  it("reports explicitly empty CSV records at their original line numbers", () => {
    const document = parseCsvDocument('Date,Payee,Amount\n2026-11-18,Cafe,-2\n,,\n\n"",\n2026-11-19,Rail,-3');
    const result = prepareImport(document, document.suggested, newLedger("USD"));
    expect(result.accepted).toHaveLength(2);
    expect(result.review.rejections.map(({ line }) => line)).toEqual([3, 5]);
  });

  it("keeps records before a repeated header with a cleaner run of rows", () => {
    const document = parseCsvDocument([
      "Date,Payee,Amount", "2026-11-18,Before,-1.00", "broken", "Date,Payee,Amount",
      ...Array.from({ length: 5 }, (_, index) => "2026-11-19,After " + index + ",-3"),
    ].join("\n"));
    expect(document.headerLine).toBe(1);
    const result = prepareImport(document, document.suggested, newLedger("USD"));
    expect(result.accepted).toHaveLength(6);
    expect(result.accepted[0].payee).toBe("Before");
    expect(result.review.rejections.map(({ line }) => line)).toEqual([3, 4]);
  });

  it("uses the unambiguous decimal convention for a three-decimal currency column", () => {
    const document = parseCsvDocument('Date,Payee,Amount\n2026-11-18,A,"1,234.125"\n2026-11-19,B,"2,345"');
    const result = prepareImport(document, document.suggested, newLedger("KWD"));
    expect(result.accepted.map(({ amountMinor }) => amountMinor)).toEqual([1_234_125, 2_345_000]);
    const ambiguous = parseCsvDocument('Date,Payee,Amount\n2026-11-19,B,"2,345"');
    const reviewed = prepareImport(ambiguous, ambiguous.suggested, newLedger("KWD"));
    expect(reviewed.review.rejections[0]?.reason).toContain("Ambiguous");
  });

  it("bounds the number of materialized CSV records and columns", () => {
    const header = "Date,Payee,Amount\n";
    expect(() => parseCsvDocument(header + "x\n".repeat(25_001))).toThrow("25,000");
    const document = parseCsvDocument(header + ",".repeat(257) + "\n2026-11-18,A,2");
    const prepared = prepareImport(document, document.suggested, newLedger("USD"));
    expect(prepared.review.rejections).toMatchObject([{ line: 2, reason: expect.stringContaining("256 columns") }]);
  });
});
