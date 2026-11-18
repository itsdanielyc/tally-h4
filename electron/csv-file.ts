import { open } from "node:fs/promises";
import { basename } from "node:path";
import type { PickedCsv } from "../application/import-commands";

const MAXIMUM_CSV_BYTES = 32 * 1024 * 1024;

function decodeCsv(bytes: Buffer): string {
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le"
    : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error("Save the CSV as UTF-8 or UTF-16 and try again.", { cause: error });
  }
}

/** Reads a selected file through one descriptor, with a size limit before decoding. */
export async function readCsvFile(path: string): Promise<PickedCsv> {
  const handle = await open(path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error("Choose a CSV file.");
    if (info.size > MAXIMUM_CSV_BYTES) throw new Error("Choose a CSV file up to 32 MB.");
    const bytes = await handle.readFile();
    if (bytes.length > MAXIMUM_CSV_BYTES) throw new Error("Choose a CSV file up to 32 MB.");
    return { name: basename(path), contents: decodeCsv(bytes) };
  } finally {
    await handle.close();
  }
}
