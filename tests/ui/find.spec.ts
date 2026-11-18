import { expect, test, type Page } from "@playwright/test";

async function record(page: Page, payee: string, date: string, note: string, amount: string): Promise<void> {
  await page.getByRole("button", { name: "Add transaction" }).click();
  const editor = page.getByRole("dialog", { name: "Add transaction" });
  await editor.getByLabel("Payee", { exact: true }).fill(payee);
  await editor.getByLabel("Date", { exact: true }).fill(date);
  await editor.getByLabel("Note", { exact: true }).fill(note);
  await editor.getByLabel("Amount", { exact: true }).fill(amount);
  await editor.getByRole("button", { name: "Save transaction" }).click();
  await expect(editor).toBeHidden();
}

test("finds notes, narrows by inclusive ranges, exports the selection and undoes a delete once", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search transactions" });
  await expect(search).toBeVisible({ timeout: 4_000 });
  await record(page, "Corner Market", "2026-11-18", "Printed receipt", "-12.90");
  await record(page, "Payroll", "2026-11-17", "", "1200");
  await search.fill("RECEIPT");
  const rows = page.getByRole("table", { name: "Transactions" }).getByRole("row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText("Corner Market");

  await page.getByText("Filters", { exact: true }).click();
  await page.getByLabel("From date").fill("2026-11-18");
  await page.getByLabel("Through date").fill("2026-11-18");
  await page.getByLabel("Minimum amount").fill("-12.90");
  await page.getByLabel("Maximum amount").fill("-12.90");
  await page.getByLabel("Filter category").selectOption("uncategorised");
  await expect(rows).toHaveCount(2);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await downloaded).suggestedFilename()).toBe("tally-transactions.csv");

  await page.getByRole("button", { name: "Edit Corner Market" }).click();
  page.once("dialog", (confirmation) => { void confirmation.accept(); });
  await page.getByRole("button", { name: "Delete transaction" }).click();
  const undo = page.getByRole("button", { name: "Undo delete" });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(rows).toHaveCount(2);
  await expect(undo).toBeHidden();
  await expect(search).toHaveValue("RECEIPT");
});
