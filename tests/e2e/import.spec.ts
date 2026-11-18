import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

test("imports through the native file port and reports the rows it rejected", async () => {
  const profile = await mkdtemp(join(tmpdir(), "tally-native-csv-"));
  let application: ElectronApplication | undefined;
  try {
    const file = join(profile, "native.csv");
    await writeFile(file, "Date,Payee,Amount\r\n2026-11-18,Market,-12.50\r\ninvalid,Unreadable,10\r\n");
    application = await electron.launch({
      args: [".", "--user-data-dir=" + profile],
      env: { ...process.env, TALLY_TEST_IMPORT_PATH: file },
    });
    const page = await application.firstWindow();
    await expect(page.getByTestId("backend-badge")).toHaveText("native");
    await page.getByRole("button", { name: "Import CSV" }).click();
    await page.getByRole("button", { name: "Choose CSV" }).click();
    await expect(page.getByText("Header on line 1")).toBeVisible();
    await page.getByRole("button", { name: "Preview import" }).click();
    await expect(page.getByText(/Line 3:.*calendar date/)).toBeVisible();
    await page.getByRole("button", { name: "Import 1 transaction", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Imported 1 transaction");
    const ledger = await page.evaluate(() => window.electronBridge?.loadLedger());
    expect(ledger?.transactions).toMatchObject([{ payee: "Market", date: "2026-11-18", amountMinor: -1250 }]);
  } finally {
    await application?.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
