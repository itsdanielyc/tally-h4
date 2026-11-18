import { EXPORT_FILENAME } from "../../domain/csv-export";

/** Exposes the browser-only mock export as a standard downloadable file. */
export async function saveMockCsv(contents: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = EXPORT_FILENAME;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
  return EXPORT_FILENAME;
}
