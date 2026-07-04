import { test, expect } from "@playwright/test";

test("หน้าแรกแสดงชื่อ ThaiPrintNect", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ThaiPrintNect" })).toBeVisible();
});
