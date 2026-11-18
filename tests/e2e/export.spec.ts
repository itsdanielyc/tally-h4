import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

test("exports only the filtered records through the native save port", async () => {
  const profile = await mkdtemp(join(tmpdir(), "tally-native-export-"));
  let application: ElectronApplication | undefined;
  try {
    const file = join(profile, "selection.csv");
    application = await electron.launch({
      args: [".", "--user-data-dir=" + profile],
      env: { ...process.env, TALLY_TEST_EXPORT_PATH: file },
    });
    const page = await application.firstWindow();
    await expect(page.getByTestId("backend-badge")).toHaveText("native");
    await page.evaluate(async () => {
      const ledger = window.electronBridge;
      if (!ledger) throw new Error("The native ledger bridge is missing.");
      await ledger.saveTransaction({ date: "2026-11-18", payee: "Market", amountMinor: -650, note: "Receipt" });
      await ledger.saveTransaction({ date: "2026-11-17", payee: "Excluded", amountMinor: 123 });
    });
    await page.reload();
    await page.getByRole("searchbox", { name: "Search transactions" }).fill("Receipt");
    await expect(page.getByRole("row").filter({ hasText: "Market" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "Excluded" })).toHaveCount(0);
    await page.getByRole("button", { name: "Export CSV" }).click();
    await expect(page.getByRole("status")).toContainText("Exported 1 transaction");
    const exported = await readFile(file, "utf8");
    expect(exported).toContain('"Market"');
    expect(exported).toContain('"Receipt"');
    expect(exported).not.toContain("Excluded");
  } finally {
    await application?.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
