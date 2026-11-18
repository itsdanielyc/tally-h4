import { describe, expect, it } from "vitest";
import { parseCsvDocument } from "../../domain/csv-document";
import { prepareImport } from "../../domain/import";

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
    const prepared = prepareImport(document, mapping, "EUR", []);
    expect(prepared.accepted).toMatchObject([
      { date: "2026-11-18", payee: 'Corner; "Market"\r\nannex', amountMinor: -123456 },
      { date: "2026-11-17", payee: "Salary", amountMinor: 300000 },
    ]);
    expect(prepared.review.rejections).toMatchObject([{ line: 5 }, { line: 6 }]);
  });

  it("handles grouped signed amounts and checks duplicates against the committed ledger", () => {
    const document = parseCsvDocument('When,Shop,Net\n03/04/2026,Market,"(1,024.30)"\n03/04/2026,Market,"(1,024.30)"\n02/04/2026,Rail,12.50');
    const mapping = { ...document.suggested, dateOrder: "MDY" as const };
    const fresh = prepareImport(document, mapping, "USD", []);
    expect(fresh.accepted).toHaveLength(3);
    expect(fresh.accepted[0]).toMatchObject({ date: "2026-03-04", amountMinor: -102430 });
    const existing = { ...fresh.accepted[0], id: "market" };
    const second = prepareImport(document, mapping, "USD", [existing]);
    expect(second.review.duplicateCount).toBe(2);
    expect(second.accepted).toMatchObject([{ payee: "Rail", amountMinor: 1250 }]);
  });

  it("rejects conflicting column mappings and split rows with both directions", () => {
    const document = parseCsvDocument("Date,Payee,Debit,Credit\n2026-11-18,Market,4,8");
    const prepared = prepareImport(document, document.suggested, "USD", []);
    expect(prepared.review.rejections[0]?.reason).toContain("both a debit and a credit");
    expect(() => prepareImport(document, { ...document.suggested, payee: document.suggested.date }, "USD", []))
      .toThrow("different columns");
  });
});
