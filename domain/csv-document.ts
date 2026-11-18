import type { CsvDelimiter, CsvMapping } from "../contracts/import";
import { scanCsv, type CsvRecord } from "./csv-scanner";

const DELIMITERS: readonly CsvDelimiter[] = [",", ";", "\t", "|"];
const SAMPLE_CHARACTERS = 64_000;
const SAMPLE_RECORDS = 48;
const NEXT_RECORDS = 5;
const ALIAS_WEIGHT = 30;
const WIDTH_WEIGHT = 4;
const LETTER = /\p{L}/u;
const GENERIC_DATE = /^\d{1,4}([./-])\d{1,2}\1\d{1,4}$/;
const HEADER_ALIASES = {
  date: ["date", "transaction date", "booking date", "posted date", "posting date", "value date", "when"],
  payee: ["payee", "description", "narrative", "details", "merchant", "name", "particulars", "transaction details", "shop"],
  signed: ["amount", "transaction amount", "signed amount", "net amount", "net"],
  debit: ["debit", "debits", "withdrawal", "withdrawals", "money out", "paid out", "debit amount"],
  credit: ["credit", "credits", "deposit", "deposits", "money in", "paid in", "credit amount"],
} as const;

export interface CsvDocument {
  readonly delimiter: CsvDelimiter;
  readonly headerLine: number;
  readonly columns: readonly string[];
  readonly suggested: CsvMapping;
  readonly rows: readonly CsvRecord[];
}

interface HeaderCandidate {
  readonly delimiter: CsvDelimiter;
  readonly record: CsvRecord;
  readonly score: number;
}

function normalizedHeader(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function matchColumn(columns: readonly string[], target: keyof typeof HEADER_ALIASES): number {
  const aliases: readonly string[] = HEADER_ALIASES[target];
  return columns.findIndex((raw) => {
    const label = normalizedHeader(raw);
    return aliases.some((alias) => label === alias || new RegExp("^" + alias + " [a-z]{3}$").test(label));
  });
}

function suggest(columns: readonly string[]): CsvMapping {
  const date = matchColumn(columns, "date");
  const payee = matchColumn(columns, "payee");
  const signed = matchColumn(columns, "signed");
  const debit = matchColumn(columns, "debit");
  const credit = matchColumn(columns, "credit");
  return {
    date: date < 0 ? 0 : date,
    payee: payee < 0 ? 1 : payee,
    dateOrder: "YMD",
    amount: debit >= 0 && credit >= 0 ? { kind: "split", debit, credit } : { kind: "signed", column: signed < 0 ? 2 : signed },
  };
}

function scoreHeader(sample: readonly CsvRecord[], offset: number): number {
  const header = sample[offset];
  if (header.issue || header.cells.length < 2 || header.cells.some((cell) => GENERIC_DATE.test(cell.trim()))) return -1;
  const aliases = (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[])
    .filter((kind) => matchColumn(header.cells, kind) >= 0).length;
  const textColumns = header.cells.filter((cell) => LETTER.test(cell)).length;
  if (!aliases && textColumns < 2) return -1;
  const matches = sample.slice(offset + 1, offset + 1 + NEXT_RECORDS)
    .filter((row) => row.cells.length === header.cells.length && !row.issue).length;
  return aliases * ALIAS_WEIGHT + matches * WIDTH_WEIGHT + Math.min(textColumns, NEXT_RECORDS);
}

function detectHeader(contents: string): HeaderCandidate {
  let best: HeaderCandidate | undefined;
  const snippet = contents.slice(0, SAMPLE_CHARACTERS);
  for (const delimiter of DELIMITERS) {
    const sample = scanCsv(snippet, delimiter, SAMPLE_RECORDS);
    for (const [offset, record] of sample.entries()) {
      const score = scoreHeader(sample, offset);
      if (score >= 0 && (best === undefined || score > best.score)) best = { delimiter, record, score };
    }
  }
  if (!best) throw new Error("Tally could not find a header row with multiple columns.");
  return best;
}

/** Detects the dialect from a bounded sample and reads the selected dialect once. */
// Time O(n) characters scanned. Space O(n) for the selected dialect's records.
export function parseCsvDocument(raw: string): CsvDocument {
  const contents = raw.replace(/^\uFEFF/, "");
  const { delimiter, record: header } = detectHeader(contents);
  const records = scanCsv(contents, delimiter);
  const columns = header.cells.map((label, index) => label.trim() || "Column " + (index + 1));
  return {
    delimiter,
    headerLine: header.line,
    columns,
    suggested: suggest(columns),
    rows: records.filter((record) => record.line > header.line),
  };
}
