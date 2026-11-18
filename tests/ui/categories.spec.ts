import { expect, test, type Page } from "@playwright/test";

async function addCategory(page: Page, name: string): Promise<void> {
  await page.getByLabel("Category name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rename " + name, exact: true })).toBeVisible();
}

test("renames, merges and deletes categories while applying a payee rule", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Categories", exact: true }).click({ timeout: 4_000 });
  await addCategory(page, "Groceries");
  await addCategory(page, "Dining");
  await page.getByRole("button", { name: "Rename Dining", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Rename category" });
  await rename.getByLabel("New name").fill("Eating out");
  await rename.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("button", { name: "Rename Eating out", exact: true })).toBeVisible();
  await page.getByLabel("Payee contains").fill("coffee");
  await page.getByLabel("Use category", { exact: true }).selectOption("Groceries");
  await page.getByRole("button", { name: "Add rule" }).click();
  await expect(page.getByText("coffee", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await page.getByRole("button", { name: "Add transaction" }).click();
  const editor = page.getByRole("dialog", { name: "Add transaction" });
  await editor.getByLabel("Date", { exact: true }).fill("2026-11-18");
  await editor.getByLabel("Payee", { exact: true }).fill("COFFEE kiosk");
  await editor.getByLabel("Amount", { exact: true }).fill("-2.50");
  await editor.getByRole("button", { name: "Save transaction" }).click();
  const coffee = page.getByRole("row").filter({ hasText: "COFFEE kiosk" });
  await expect(coffee).toContainText("Uncategorised");

  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Apply rules" }).click();
  await expect(page.getByRole("status")).toContainText("Rules applied");
  await page.getByLabel("Category to merge").selectOption("Groceries");
  await page.getByLabel("Merge into").selectOption("Eating out");
  page.once("dialog", (confirmation) => { void confirmation.accept(); });
  await page.getByRole("button", { name: "Merge categories" }).click();
  await expect(page.getByRole("button", { name: "Rename Groceries", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(coffee).toContainText("Eating out");

  await page.getByRole("button", { name: "Categories", exact: true }).click();
  page.once("dialog", (confirmation) => { void confirmation.accept(); });
  await page.getByRole("button", { name: "Delete Eating out", exact: true }).click();
  await expect(page.getByText("No payee rules yet.")).toBeVisible();
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(coffee).toContainText("Uncategorised");
});
