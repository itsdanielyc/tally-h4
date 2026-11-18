import { expect, test, type Page } from "@playwright/test";

const BANK_CSV = [
  "River Bank statement",
  "Date;Description;Paid out;Paid in",
  '18/11/2026;"Corner, Market";"10,25";',
  "17/11/2026;Payroll;;1250",
  "31/02/2026;Invalid date;4;",
].join("\n");

async function pickFile(page: Page): Promise<void> {
  const pendingFile = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose CSV" }).click();
  await (await pendingFile).setFiles({
    name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from(BANK_CSV),
  });
  await expect(page.getByText("Header on line 2")).toBeVisible();
}

async function inspect(page: Page): Promise<void> {
  await page.getByLabel("Date order").selectOption("DMY");
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText(/Line 5:.*calendar date/)).toBeVisible();
}

test("previews mapped debit and credit rows, reports rejections and skips reimports", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("backend-badge")).toHaveText("mock");
  await page.getByRole("button", { name: "Import CSV" }).click();
  await pickFile(page);
  await inspect(page);
  await expect(page.getByRole("table", { name: "Import preview" })).toContainText("Corner, Market");
  await expect(page.getByRole("table", { name: "Import preview" })).toContainText("−$10.25");
  await page.getByRole("button", { name: "Import 2 transactions" }).click();
  await expect(page.getByRole("status")).toContainText("Imported 2 transactions");
  await pickFile(page);
  await inspect(page);
  await expect(page.getByText("2 duplicates")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import 0 transactions" })).toBeDisabled();
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(page.getByRole("table", { name: "Transactions" }).getByRole("row")).toHaveCount(3);
});
