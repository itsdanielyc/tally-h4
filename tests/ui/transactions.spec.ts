import { expect, test, type Page } from "@playwright/test";

async function record(page: Page, date: string, payee: string, amount: string): Promise<void> {
  await page.getByRole("button", { name: "Add transaction" }).click();
  const editor = page.getByRole("dialog", { name: "Add transaction" });
  await editor.getByLabel("Date", { exact: true }).fill(date);
  await editor.getByLabel("Payee", { exact: true }).fill(payee);
  await editor.getByLabel("Amount", { exact: true }).fill(amount);
  await editor.getByRole("button", { name: "Save transaction" }).click();
  await expect(editor).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("backend-badge")).toHaveText("mock");
});

test("records, sorts, edits and deletes transactions", async ({ page }) => {
  await record(page, "2026-11-18", "Corner Market", "-10.25");
  await record(page, "2026-11-17", "Payroll", "1250");
  const rows = page.getByRole("table", { name: "Transactions" }).getByRole("row");
  await expect(rows.nth(1)).toContainText("Corner Market");
  await expect(rows.nth(1)).toContainText("−$10.25");
  await expect(rows.nth(2)).toContainText("Payroll");

  await page.getByRole("button", { name: "Edit Corner Market" }).click();
  const editor = page.getByRole("dialog", { name: "Edit transaction" });
  await editor.getByLabel("Category", { exact: true }).fill("Groceries");
  await editor.getByLabel("Note", { exact: true }).fill("Weekly shop");
  await editor.getByRole("button", { name: "Save transaction" }).click();
  await expect(rows.nth(1)).toContainText("Groceries");
  await expect(rows.nth(1)).toContainText("Weekly shop");

  await page.getByRole("button", { name: "Edit Payroll" }).click();
  page.once("dialog", (confirmation) => { void confirmation.accept(); });
  await editor.getByRole("button", { name: "Delete transaction" }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByText("Payroll", { exact: true })).toHaveCount(0);
});

test("selects a currency before the first transaction", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  const currency = page.getByLabel("Ledger currency");
  await currency.selectOption("JPY");
  await page.getByRole("button", { name: "Save currency" }).click();
  await expect(page.getByRole("status")).toHaveText("Currency saved.");
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await record(page, "2026-11-19", "Rail fare", "-1450");
  await expect(page.getByRole("row").filter({ hasText: "Rail fare" })).toContainText("−¥1,450");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(currency).toBeDisabled();
});
