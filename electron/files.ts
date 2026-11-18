import { app, dialog } from "electron";
import type { PickedCsv } from "../application/import-commands";
import { readCsvFile } from "./csv-file";

const CSV_FILTER = { name: "CSV files", extensions: ["csv", "tsv", "txt"] };

/** Isolates native selection from the importer. The debug-only path supports L6. */
export async function pickNativeCsv(): Promise<PickedCsv | null> {
  const testPath = app.isPackaged ? undefined : process.env.TALLY_TEST_IMPORT_PATH;
  if (testPath) return readCsvFile(testPath);
  const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [CSV_FILTER] });
  const chosen = result.filePaths[0];
  return !result.canceled && chosen ? readCsvFile(chosen) : null;
}
