import type { CsvDelimiter, CsvMapping } from "../contracts/import";
import { scanCsv, type CsvRecord } from "./csv-scanner";
import { exportHeaders } from "./csv-export";
import { MAXIMUM_CSV_DATA_ROWS } from "./csv-limits";

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
type HeaderKind = keyof typeof HEADER_ALIASES;
const HEADER_KINDS = Object.keys(HEADER_ALIASES) as HeaderKind[];
const CURRENCY_SUFFIX = /^[a-z]{3}$/;

export interface CsvDocument {
  readonly delimiter: CsvDelimiter;
  readonly headerLine: number;
  readonly columns: readonly string[];
  readonly suggested: CsvMapping;
  readonly rows: readonly CsvRecord[];
  readonly tallyExport: boolean;
}

interface HeaderCandidate {
  readonly delimiter: CsvDelimiter;
  readonly record: CsvRecord;
  readonly score: number;
}

function normalizedHeader(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function matchesAlias(label: string, alias: string): boolean {
  return label === alias || (label.startsWith(alias + " ") && CURRENCY_SUFFIX.test(label.slice(alias.length + 1)));
}

function matchColumn(columns: readonly string[], target: HeaderKind): number {
  const aliases: readonly string[] = HEADER_ALIASES[target];
  return columns.findIndex((raw) => {
    const label = normalizedHeader(raw);
    return aliases.some((alias) => matchesAlias(label, alias));
  });
}

function headerLayout(columns: readonly string[]): string {
  const labels = columns.map(normalizedHeader);
  const fields = labels.map((label) => HEADER_KINDS.find((kind) =>
    HEADER_ALIASES[kind].some((alias) => matchesAlias(label, alias))) ?? null);
  const knownAmount = fields.includes("signed") || (fields.includes("debit") && fields.includes("credit"));
  const knownLayout = fields.includes("date") && fields.includes("payee") && knownAmount;
  return JSON.stringify(knownLayout ? fields : labels);
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
  const aliases = HEADER_KINDS.filter((kind) => matchColumn(header.cells, kind) >= 0).length;
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
    const firstByLayout = new Map<string, CsvRecord>();
    for (const [offset, record] of sample.entries()) {
      const score = scoreHeader(sample, offset);
      if (score < 0) continue;
      const layout = headerLayout(record.cells);
      const first = firstByLayout.get(layout) ?? record;
      firstByLayout.set(layout, first);
      if (best === undefined || score > best.score) best = { delimiter, record: first, score };
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
  const records = scanCsv(contents, delimiter, MAXIMUM_CSV_DATA_ROWS + SAMPLE_RECORDS + 1);
  const rows = records.filter((record) => record.line > header.line);
  if (rows.length > MAXIMUM_CSV_DATA_ROWS) {
    throw new Error("Choose a CSV with at most " + MAXIMUM_CSV_DATA_ROWS.toLocaleString("en-US") + " data rows.");
  }
  const columns = header.cells.map((label, index) => label.trim() || "Column " + (index + 1));
  return {
    delimiter,
    headerLine: header.line,
    columns,
    suggested: suggest(columns),
    rows,
    tallyExport: delimiter === "," && columns.length === exportHeaders.length &&
      exportHeaders.every((label, index) => label === columns[index]),
  };
}
