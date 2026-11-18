import { dateOrders, type CsvMapping, type ImportReview, type RejectedRow } from "../contracts/import";
import type { Ledger, Transaction } from "../contracts/ledger";
import { createRuleMatcher } from "./categories";
import type { CsvDocument } from "./csv-document";
import { decodeExportText, exportIndex } from "./csv-export";
import { inferCsvDecimal, parseCsvAmount, parseCsvDate, type DecimalMark } from "./csv-values";
import { validateCurrency } from "./money";
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

function readAmount(
  cells: readonly string[], mapping: CsvMapping["amount"], currency: string, decimals: ReadonlyMap<number, DecimalMark>,
): number {
  const parse = (column: number): number => parseCsvAmount(cells[column], currency, decimals.get(column));
  if (mapping.kind === "signed") return parse(mapping.column);
  const debit = cells[mapping.debit].trim();
  const credit = cells[mapping.credit].trim();
  if (!debit && !credit) throw new Error("The row has no debit or credit amount.");
  const out = debit ? Math.abs(parse(mapping.debit)) : 0;
  const incoming = credit ? parse(mapping.credit) : 0;
  if (incoming < 0) throw new Error("The credit amount must be positive or zero.");
  if (out && incoming) throw new Error("The row has both a debit and a credit.");
  return incoming - out;
}

function* valuesIn(document: CsvDocument, column: number): Iterable<string> {
  for (const row of document.rows) {
    if (!row.issue && row.cells.length === document.columns.length) yield row.cells[column];
  }
}

function amountConventions(document: CsvDocument, mapping: CsvMapping["amount"], currency: string): ReadonlyMap<number, DecimalMark> {
  const columns = mapping.kind === "signed" ? [mapping.column] : [mapping.debit, mapping.credit];
  const conventions = new Map<number, DecimalMark>();
  for (const column of columns) {
    const mark = document.tallyExport ? "." : inferCsvDecimal(valuesIn(document, column), currency);
    if (mark) conventions.set(column, mark);
  }
  return conventions;
}

function identity(transaction: Candidate): string {
  return JSON.stringify([transaction.date, transaction.amountMinor, transaction.payee]);
}

interface PreparedImport {
  readonly accepted: readonly Candidate[];
  readonly review: ImportReview;
}

function importCurrency(document: CsvDocument, ledger: Ledger): string {
  if (!document.tallyExport) return ledger.currency;
  for (const row of document.rows) {
    if (row.issue || row.cells.length !== document.columns.length) continue;
    let currency: string;
    try {
      currency = validateCurrency(row.cells[exportIndex.currency]);
    } catch {
      continue;
    }
    if (ledger.currency !== currency && (ledger.transactions.length || ledger.budgets.length)) {
      throw new Error("This Tally CSV uses " + currency + ". Import it into a ledger that uses the same currency.");
    }
    return currency;
  }
  return ledger.currency;
}

interface RowInterpretation {
  readonly tallyExport: boolean;
  readonly matchRule: (payee: string) => string;
  readonly decimals: ReadonlyMap<number, DecimalMark>;
}

function readRow(
  cells: readonly string[], mapping: CsvMapping, currency: string, interpretation: RowInterpretation,
): Candidate {
  const { tallyExport, matchRule, decimals } = interpretation;
  const payee = tallyExport ? decodeExportText(cells[mapping.payee]) : cells[mapping.payee];
  if (tallyExport && cells[exportIndex.currency] !== currency) throw new Error("The row uses a different or invalid currency.");
  return validateTransaction({
    date: parseCsvDate(cells[mapping.date], mapping.dateOrder), payee,
    amountMinor: readAmount(cells, mapping.amount, currency, decimals),
    category: tallyExport ? decodeExportText(cells[exportIndex.category]) : matchRule(payee),
    note: tallyExport ? decodeExportText(cells[exportIndex.note]) : "",
  });
}

/** Parses and classifies every row against one committed ledger snapshot. */
// Time O(file characters plus existing transactions). Space O(existing transactions plus file rows).
export function prepareImport(document: CsvDocument, mapping: CsvMapping, ledger: Ledger): PreparedImport {
  checkMapping(mapping, document.columns.length);
  const currency = importCurrency(document, ledger);
  const interpretation = {
    tallyExport: document.tallyExport,
    matchRule: createRuleMatcher(ledger.rules),
    decimals: amountConventions(document, mapping.amount, currency),
  };
  const known = new Set(ledger.transactions.map(identity));
  const accepted: Candidate[] = [];
  const rejections: RejectedRow[] = [];
  let duplicateCount = 0;
  for (const row of document.rows) {
    try {
      if (row.issue) throw new Error(row.issue);
      if (row.cells.length !== document.columns.length) throw new Error("The row has a different number of columns from the header.");
      const transaction = readRow(row.cells, mapping, currency, interpretation);
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
