import { describe, it, expect } from "vitest";
import {
  generateQuotationHTML,
  formatThaiDate,
  COMPANY,
} from "@/domain/quotation";
import { PricingEngine } from "@/domain/pricing";
import { getDefaultPriceTable } from "@/lib/price-table/default-price-table";

describe("quotation/formatThaiDate", () => {
  it("แปลงเป็น DD/MM/YYYY พ.ศ. (Buddhist Era)", () => {
    expect(formatThaiDate(new Date(2024, 0, 15))).toBe("15/01/2567");
    expect(formatThaiDate(new Date(2025, 11, 5))).toBe("05/12/2568");
  });
});

describe("quotation/generateQuotationHTML", () => {
  const priceTable = getDefaultPriceTable();
  const specs = {
    size: { width: 10, height: 5 },
    material: "paper",
    colorCount: 2,
    quantity: 1000,
  };
  const result = PricingEngine.calculate("screen", "sticker", specs, priceTable);

  it("มีชื่อบริษัทและหัวข้อใบเสนอราคา", () => {
    const html = generateQuotationHTML(result, specs);
    expect(html).toContain(COMPANY.name);
    expect(html).toContain("ใบเสนอราคา");
    expect(html).toContain("ซิลค์สกรีน"); // system name ภาษาไทย
    expect(html).toContain("สติกเกอร์"); // product name ภาษาไทย
  });

  it("แสดงราคารวมที่ฟอร์แมตแล้ว", () => {
    const html = generateQuotationHTML(result, specs);
    expect(html).toContain(PricingEngine.formatCurrency(result.totalPrice));
  });

  it("รองรับตารางราคาตามจำนวน (multiItems)", () => {
    const r2 = PricingEngine.calculate(
      "screen",
      "sticker",
      { ...specs, quantity: 5000 },
      priceTable
    );
    const html = generateQuotationHTML(result, specs, [
      { quantity: 1000, result },
      { quantity: 5000, result: r2 },
    ]);
    expect(html).toContain("ราคาตามจำนวนสั่งซื้อ");
  });
});
