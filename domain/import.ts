import { dateOrders, type CsvMapping, type ImportReview, type RejectedRow } from "../contracts/import";
import type { Transaction } from "../contracts/ledger";
import type { CsvDocument } from "./csv-document";
import { parseCsvAmount, parseCsvDate } from "./csv-values";
import { isRecord, validateTransaction } from "./transactions";

const PREVIEW_LIMIT = 8;
type Candidate = Omit<Transaction, "id">;

function checkMapping(mapping: CsvMapping, width: number): void {
  if (!isRecord(mapping) || !isRecord(mapping.amount) || !dateOrders.includes(mapping.dateOrder)) {
    throw new Error("Choose the columns and date order for this CSV.");
  }
  const amount = mapping.amount;
  if (amount.kind !== "signed" && amount.kind !== "split") throw new Error("Choose the amount format.");
  const indexes = [mapping.date, mapping.payee, ...(amount.kind === "signed" ? [amount.column] : [amount.debit, amount.credit])];
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= width)) {
    throw new Error("Map each field to a column in this CSV.");
  }
  if (new Set(indexes).size !== indexes.length) throw new Error("Map fields to different columns.");
}

function readAmount(cells: readonly string[], mapping: CsvMapping["amount"], currency: string): number {
  if (mapping.kind === "signed") return parseCsvAmount(cells[mapping.column], currency);
  const debit = cells[mapping.debit].trim();
  const credit = cells[mapping.credit].trim();
  if (!debit && !credit) throw new Error("The row has no debit or credit amount.");
  const out = debit ? Math.abs(parseCsvAmount(debit, currency)) : 0;
  const incoming = credit ? parseCsvAmount(credit, currency) : 0;
  if (incoming < 0) throw new Error("The credit amount must be positive or zero.");
  if (out && incoming) throw new Error("The row has both a debit and a credit.");
  return incoming - out;
}

function identity(transaction: Candidate): string {
  return JSON.stringify([transaction.date, transaction.amountMinor, transaction.payee]);
}

interface PreparedImport {
  readonly accepted: readonly Candidate[];
  readonly review: ImportReview;
}

/** Parses and classifies every row against one committed ledger snapshot. */
// Time O(file characters plus existing transactions). Space O(existing transactions plus file rows).
export function prepareImport(
  document: CsvDocument, mapping: CsvMapping, currency: string, existing: readonly Transaction[],
): PreparedImport {
  checkMapping(mapping, document.columns.length);
  const known = new Set(existing.map(identity));
  const accepted: Candidate[] = [];
  const rejections: RejectedRow[] = [];
  let duplicateCount = 0;
  for (const row of document.rows) {
    try {
      if (row.issue) throw new Error(row.issue);
      if (row.cells.length !== document.columns.length) throw new Error("The row has a different number of columns from the header.");
      const transaction = validateTransaction({
        date: parseCsvDate(row.cells[mapping.date], mapping.dateOrder),
        payee: row.cells[mapping.payee],
        amountMinor: readAmount(row.cells, mapping.amount, currency),
      });
      if (known.has(identity(transaction))) duplicateCount++;
      else accepted.push(transaction);
    } catch (error) {
      rejections.push({ line: row.line, reason: error instanceof Error ? error.message : "The row could not be read." });
    }
  }
  return {
    accepted,
    review: { currency, acceptedCount: accepted.length, duplicateCount, rejections, preview: accepted.slice(0, PREVIEW_LIMIT) },
  };
}
