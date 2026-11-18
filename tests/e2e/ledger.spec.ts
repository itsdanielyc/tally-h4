import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const TIER_ONE_ARCHITECTURES: Partial<Record<NodeJS.Platform, NodeJS.Architecture>> = {
  darwin: "arm64",
  linux: "x64",
  win32: "x64",
};

function launch(profile: string): Promise<ElectronApplication> {
  return electron.launch({ args: [".", "--user-data-dir=" + profile], cwd: process.cwd() });
}

test("the native ledger reopens an unchanged record after restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tally-shell-"));
  const consoleErrors: string[] = [];
  let application: ElectronApplication | undefined;
  try {
    application = await launch(directory);
    const page = await application.firstWindow();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await expect(page).toHaveTitle("Tally");
    await expect(page.getByTestId("backend-badge")).toHaveText("native");
    expect(await page.evaluate(() => ({
      bridge: typeof window.electronBridge,
      require: typeof (globalThis as { require?: unknown }).require,
      process: typeof (globalThis as { process?: unknown }).process,
    }))).toEqual({ bridge: "object", require: "undefined", process: "undefined" });

    await page.getByRole("button", { name: "Add transaction" }).click();
    const editor = page.getByRole("dialog", { name: "Add transaction" });
    await editor.getByLabel("Date", { exact: true }).fill("2026-11-18");
    await editor.getByLabel("Payee", { exact: true }).fill("Corner Market");
    await editor.getByLabel("Amount", { exact: true }).fill("-10");
    await editor.getByLabel("Category", { exact: true }).fill("Groceries");
    await editor.getByLabel("Note", { exact: true }).fill("Weekly shop");
    await editor.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Corner Market" })).toContainText("Weekly shop");
    const committed = await page.evaluate(() => window.electronBridge?.loadLedger());
    expect(committed?.transactions).toHaveLength(1);
    expect(committed?.transactions[0]).toMatchObject({
      date: "2026-11-18", payee: "Corner Market", category: "Groceries", note: "Weekly shop",
    });
    await application.close();
    application = await launch(directory);
    const reopened = await application.firstWindow();
    await expect(reopened.getByRole("row").filter({ hasText: "Corner Market" })).toContainText("Weekly shop");
    await expect(reopened.getByTestId("backend-badge")).toHaveText("native");
    const restored = await reopened.evaluate(() => window.electronBridge?.loadLedger());
    expect(restored).toEqual(committed);
    const platform = await application.evaluate(() => ({ os: process.platform, arch: process.arch }));
    expect(platform.arch).toBe(TIER_ONE_ARCHITECTURES[platform.os]);
    const artifacts = join(process.cwd(), "artifacts", "e2e");
    await mkdir(artifacts, { recursive: true });
    await reopened.screenshot({ path: join(artifacts, platform.os + "-" + platform.arch + ".png") });
    expect(consoleErrors).toEqual([]);
  } finally {
    await application?.close();
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
