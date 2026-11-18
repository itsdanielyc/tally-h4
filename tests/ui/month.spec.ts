import { expect, test, type Page } from "@playwright/test";

async function record(page: Page, date: string, payee: string, amount: string, category: string): Promise<void> {
  await page.getByRole("button", { name: "Add transaction" }).click();
  const editor = page.getByRole("dialog", { name: "Add transaction" });
  await editor.getByLabel("Date", { exact: true }).fill(date);
  await editor.getByLabel("Payee", { exact: true }).fill(payee);
  await editor.getByLabel("Amount", { exact: true }).fill(amount);
  await editor.getByLabel("Category", { exact: true }).fill(category);
  await editor.getByRole("button", { name: "Save transaction" }).click();
  await expect(editor).toBeHidden();
}

test("compares spending and income by month and displays budget left or over", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(2026, 10, 18, 12));
  await page.goto("/");
  await record(page, "2026-11-01", "Pay", "1000.25", "");
  await record(page, "2026-11-30", "Market", "-30.10", "Food");
  await record(page, "2026-10-31", "Train", "-9.20", "Travel");
  await page.getByRole("button", { name: "Monthly summary", exact: true }).click({ timeout: 4_000 });
  await expect(page.getByTestId("month-income")).toHaveText("$1,000.25");
  await expect(page.getByTestId("month-spending")).toHaveText("$30.10");
  await expect(page.getByTestId("month-net")).toHaveText("$970.15");

  await page.getByLabel("Budget category").selectOption("Food");
  await page.getByLabel("Monthly budget", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Food" })).toContainText("$9.90 left");
  await page.getByLabel("Budget category").selectOption("Food");
  await page.getByLabel("Monthly budget", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Food" })).toContainText("$5.10 over");

  const priorTotalsDuringChange = await page.getByRole("button", { name: "Previous month" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    return document.querySelector('[data-testid="month-spending"]')?.textContent;
  });
  expect(priorTotalsDuringChange).toBeUndefined();
  await expect(page.getByTestId("month-spending")).toHaveText("$9.20");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByTestId("month-spending")).toHaveText("$30.10");
  await page.screenshot({ path: testInfo.outputPath("monthly-summary.png") });
});
