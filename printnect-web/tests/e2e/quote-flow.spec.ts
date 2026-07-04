import { test, expect } from "@playwright/test";

test("flow: คำนวณราคา → จัดทำใบเสนอราคา", async ({ page }) => {
  await page.goto("/calculator");

  // ค่า default: ซิลค์สกรีน / สติกเกอร์ — กดคำนวณได้เลย
  await expect(page.getByRole("heading", { name: "คำนวณราคางานพิมพ์" })).toBeVisible();
  await page.getByRole("button", { name: "คำนวณราคา" }).click();

  // ผลลัพธ์ปรากฏ
  await expect(page.getByRole("heading", { name: "ผลการคำนวณ" })).toBeVisible();
  await expect(page.getByText("ราคารวม")).toBeVisible();

  // ไปหน้าใบเสนอราคา
  await page.getByRole("button", { name: "จัดทำใบเสนอราคา" }).click();
  await expect(page).toHaveURL(/\/quotation$/);

  // ใบเสนอราคาแสดงชื่อบริษัท + หัวข้อ
  await expect(
    page.getByRole("heading", { name: "ใบเสนอราคา" })
  ).toBeVisible();
  await expect(
    page.getByText("บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "พิมพ์ใบเสนอราคา" })).toBeVisible();
});
