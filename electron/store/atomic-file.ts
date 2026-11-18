import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

type Replace = (temporary: string, destination: string) => Promise<void>;

async function syncDirectory(directory: string): Promise<void> {
  if (process.platform === "win32") return;
  try {
    const handle = await open(directory, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    // The rename already committed. Reporting a failed mutation here could lead to duplicate retries.
    console.warn("The file was replaced, but the directory could not be synced.", error);
  }
}

/** Writes and syncs a temporary sibling before atomically replacing the destination. */
export async function replaceFileAtomically(destination: string, contents: string, replace: Replace = rename): Promise<void> {
  const directory = dirname(destination);
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, "." + basename(destination) + "." + randomUUID() + ".tmp");
  const handle = await open(temporary, "wx", 0o600);
  try {
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await replace(temporary, destination);
  } finally {
    await rm(temporary, { force: true }).catch((error: unknown) => {
      console.warn("The temporary file could not be removed.", error);
    });
  }
  await syncDirectory(directory);
}
