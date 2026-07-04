import { test, expect } from "@playwright/test";

test("หน้าแรกแสดงชื่อ PrintNect", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PrintNect" })).toBeVisible();
});
