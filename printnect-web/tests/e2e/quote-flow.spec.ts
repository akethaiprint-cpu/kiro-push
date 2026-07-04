import { test, expect } from "@playwright/test";

test("flow: wizard คำนวณราคา → จัดทำใบเสนอราคา", async ({ page }) => {
  await page.goto("/calculator");

  await expect(
    page.getByRole("heading", { name: "เลือกและกำหนดหมวดหมู่งานพิมพ์" })
  ).toBeVisible();

  // step 1 → 2 → 3 → 4 (ใช้ค่า default)
  await page.getByRole("button", { name: /ขั้นตอนต่อไป/ }).click(); // 1->2
  await page.getByRole("button", { name: /ขั้นตอนต่อไป/ }).click(); // 2->3
  await page.getByRole("button", { name: /คำนวณราคา/ }).click(); // 3->4

  // step 4: แสดงราคารวม
  await expect(
    page.getByRole("heading", { name: "ยืนยันการสั่งซื้อ" })
  ).toBeVisible();
  await expect(page.getByText("ราคารวม")).toBeVisible();

  // จัดทำใบเสนอราคา → ไปหน้า /quotation
  await page.getByRole("button", { name: "จัดทำใบเสนอราคา" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await expect(
    page.getByRole("heading", { name: "ใบเสนอราคา" })
  ).toBeVisible();
  await expect(
    page.getByText("บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด")
  ).toBeVisible();
});
