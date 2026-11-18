import type { ImportRequest, ImportSource } from "../contracts/import";
import type { Ledger, LedgerApi } from "../contracts/ledger";
import { createRuleMatcher } from "../domain/categories";
import { parseCsvDocument, type CsvDocument } from "../domain/csv-document";
import { prepareImport } from "../domain/import";
import type { LedgerSession } from "./ledger-session";

/** A CSV obtained through the platform's file picker. */
export interface PickedCsv {
  readonly name: string;
  readonly contents: string;
}

export type PickCsv = () => Promise<PickedCsv | null>;
type ImportCommands = Pick<LedgerApi, "chooseImportFile" | "previewImport" | "confirmImport">;

/** Owns the selected source and the preview/commit flow for one application session. */
export function createImportCommands(
  session: LedgerSession, pickCsv: PickCsv, view: (ledger: Ledger) => Ledger, makeId: () => string,
): ImportCommands {
  let pending: { readonly source: ImportSource; readonly document: CsvDocument } | undefined;

  function selected(request: ImportRequest): CsvDocument {
    if (!request || !pending || request.token !== pending.source.token) {
      throw new Error("Choose the CSV again before importing.");
    }
    return pending.document;
  }

  return {
    chooseImportFile: async () => {
      const file = await pickCsv();
      if (!file) return null;
      const document = parseCsvDocument(file.contents);
      const source = {
        token: makeId(), name: file.name, delimiter: document.delimiter,
        headerLine: document.headerLine, columns: document.columns, suggested: document.suggested,
      };
      pending = { source, document };
      return source;
    },
    previewImport: (request) => session.read((ledger) =>
      prepareImport(selected(request), request.mapping, ledger.currency, ledger.transactions, createRuleMatcher(ledger.rules)).review),
    confirmImport: (request) => session.change((ledger) => {
      const { accepted, review } = prepareImport(
        selected(request), request.mapping, ledger.currency, ledger.transactions, createRuleMatcher(ledger.rules),
      );
      const rows = accepted.map((entry) => ({ ...entry, id: makeId() }));
      const updated = rows.length ? { ...ledger, transactions: [...ledger.transactions, ...rows] } : ledger;
      return {
        ledger: updated,
        result: { ledger: view(updated), imported: rows.length, duplicateCount: review.duplicateCount, rejections: review.rejections },
      };
    }),
  };
}
