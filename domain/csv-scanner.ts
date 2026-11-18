import type { CsvDelimiter } from "../contracts/import";

export interface CsvRecord {
  readonly line: number;
  readonly cells: readonly string[];
  readonly issue?: string;
}

type FieldState = "unquoted" | "quoted" | "closed";

/** Collects CSV records with physical line numbers even when a quote spans lines. */
class CsvScanner {
  private readonly records: CsvRecord[] = [];
  private cells: string[] = [];
  private field = "";
  private state: FieldState = "unquoted";
  private issue?: string;
  private line = 1;
  private recordLine = 1;

  constructor(private readonly delimiter: CsvDelimiter) {}

  // Time O(n) characters scanned. Space O(n) characters in the records.
  read(input: string, limit: number): CsvRecord[] {
    for (let offset = 0; offset < input.length; offset++) {
      const character = input.charAt(offset);
      const next = input.charAt(offset + 1);
      if (character === "\n" || character === "\r") {
        const isCrLf = character === "\r" && next === "\n";
        this.readLineBreak(isCrLf ? "\r\n" : character);
        if (isCrLf) offset++;
        if (this.records.length >= limit) return this.records;
      } else if (character === '"') {
        if (this.readQuote(next)) offset++;
      } else if (character === this.delimiter && this.state !== "quoted") {
        this.endField();
      } else {
        this.readText(character);
      }
    }
    if (this.state === "quoted") this.issue ??= "An opening quote has no matching closing quote.";
    this.endRecord();
    return this.records;
  }

  private readQuote(next: string): boolean {
    if (this.state === "quoted") {
      if (next === '"') {
        this.field += '"';
        return true;
      }
      this.state = "closed";
    } else if (this.state === "unquoted" && !this.field.trim()) {
      this.field = "";
      this.state = "quoted";
    } else {
      this.issue ??= "Quote appears inside an unquoted field.";
    }
    return false;
  }

  private readText(character: string): void {
    if (this.state !== "closed") this.field += character;
    else if (character.trim()) this.issue ??= "Unexpected text after a closing quote.";
  }

  private readLineBreak(newline: string): void {
    ++this.line;
    if (this.state === "quoted") this.field += newline;
    else {
      this.endRecord();
      this.recordLine = this.line;
    }
  }

  private endField(): void {
    this.cells.push(this.field);
    this.field = "";
    this.state = "unquoted";
  }

  private endRecord(): void {
    this.endField();
    if (this.issue || this.cells.some((cell) => cell.trim())) {
      this.records.push({ line: this.recordLine, cells: this.cells, issue: this.issue });
    }
    this.cells = [];
    this.issue = undefined;
  }
}

/** Tokenizes a document or a bounded sample with one candidate delimiter. */
export function scanCsv(contents: string, delimiter: CsvDelimiter, limit = Number.POSITIVE_INFINITY): CsvRecord[] {
  return new CsvScanner(delimiter).read(contents, limit);
}
