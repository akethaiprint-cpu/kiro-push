// @ts-nocheck
/**
 * Quotation HTML generator (ported จาก js/quotation-printer.js — ส่วนที่ pure)
 * สร้างสตริง HTML ใบเสนอราคา A4 (ไม่มี side effect / ไม่แตะ DOM)
 * ส่วนที่แตะ DOM (เปิด print dialog) แยกไปที่ src/lib/quotation/print-client.ts
 */
import { PricingEngine } from "@/domain/pricing";
import type { CalculationResult, Specs } from "@/domain/pricing/types";

export const COMPANY = {
  name: "บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด",
  address: "16/5 หมู่ 9 ถ.จันทร์ทองเอี่ยม ต.บางแม่นาง อ.บางใหญ่ จ.นนทบุรี 11140",
  phone: "โทร. 02-149-4518, 081-770-7544",
};

export const QUOTATION_SYSTEM_NAMES: Record<string, string> = {
  screen: "ซิลค์สกรีน",
  digitalOffset: "ดิจิทัล Offset",
  industrialOffset: "Offset อุตสาหกรรม",
  inkjet: "อิงค์เจ็ท",
  paperCalc: "คำนวณราคากระดาษ",
  pressSheet: "คำนวณใบพิมพ์",
};

export const QUOTATION_PRODUCT_NAMES: Record<string, string> = {
  sticker: "สติกเกอร์",
  box: "กล่อง",
  fabricBag: "ถุงผ้า",
  label: "ฉลากสินค้า",
  boxSmall: "กล่องจำนวนน้อย",
  businessCard: "นามบัตร",
  brochure: "โบรชัวร์",
  leaflet: "แผ่นพับ",
  book: "หนังสือ",
  catalog: "แคตตาล็อก",
  vinylSign: "ป้ายไวนิล",
  largeSticker: "สติกเกอร์ขนาดใหญ่",
  banner: "แบนเนอร์",
  poster: "โปสเตอร์",
};

/** Format วันที่เป็น DD/MM/YYYY พ.ศ. (Buddhist Era) */
export function formatThaiDate(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear() + 543;
  const dd = day < 10 ? "0" + day : "" + day;
  const mm = month < 10 ? "0" + month : "" + month;
  return dd + "/" + mm + "/" + year;
}

export interface MultiItem {
  quantity: number;
  result: CalculationResult;
}

/** สร้าง HTML เอกสารใบเสนอราคาฉบับเต็ม (A4) */
export function generateQuotationHTML(
  result: CalculationResult,
  specs: Specs,
  multiItems?: MultiItem[]
): string {
  const today = formatThaiDate(new Date());
  const formatCurrency = (amount: number) => PricingEngine.formatCurrency(amount);

  const systemName = QUOTATION_SYSTEM_NAMES[result.system] || result.system;
  const productTypeName =
    QUOTATION_PRODUCT_NAMES[result.productType] || result.productType;

  let sizeStr = "";
  if (specs && specs.size) {
    sizeStr = specs.size.depth
      ? specs.size.width + " x " + specs.size.height + " x " + specs.size.depth + " ซม."
      : specs.size.width + " x " + specs.size.height + " ซม.";
  }

  const materialStr = specs && specs.material ? specs.material : "-";
  const colorCountStr = specs && specs.colorCount ? specs.colorCount + " สี" : "-";
  const quantityStr = result.quantity
    ? result.quantity.toLocaleString() + " ชิ้น"
    : "-";

  let costRows = "";
  if (result.costBreakdown && result.costBreakdown.length > 0) {
    for (let i = 0; i < result.costBreakdown.length; i++) {
      const item = result.costBreakdown[i];
      if (item.conditional && item.amount <= 0) continue;
      let displayValue = "";
      if (item.text) {
        displayValue = item.text;
      } else if (item.unit) {
        displayValue =
          item.amount.toLocaleString("th-TH", { maximumFractionDigits: 2 }) +
          " " +
          item.unit;
      } else {
        displayValue = formatCurrency(item.amount);
      }
      costRows +=
        '<tr><td style="padding: 6px 8px; border-bottom: 1px solid #eee;">' +
        item.label +
        '</td><td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">' +
        displayValue +
        "</td></tr>";
    }
  }

  let rateTable = "";
  if (multiItems && multiItems.length > 1) {
    let rateRows = "";
    for (let j = 0; j < multiItems.length; j++) {
      const mi = multiItems[j];
      const per = mi.result.totalPrice / mi.quantity;
      rateRows +=
        "<tr>" +
        '<td style="padding: 6px 8px; border-bottom: 1px solid #eee;">' +
        mi.quantity.toLocaleString() +
        " ชิ้น</td>" +
        '<td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">' +
        formatCurrency(mi.result.totalPrice) +
        "</td>" +
        '<td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">' +
        formatCurrency(per) +
        "</td>" +
        "</tr>";
    }
    rateTable =
      '<div class="title" style="font-size: 15px; margin: 10px 0;">ราคาตามจำนวนสั่งซื้อ</div>' +
      '<table class="cost-table">' +
      '<thead><tr><th>จำนวน</th><th style="text-align: right;">ราคารวม</th><th style="text-align: right;">ราคา/ชิ้น</th></tr></thead>' +
      "<tbody>" +
      rateRows +
      "</tbody></table>";
  }

  return (
    "<!DOCTYPE html>" +
    '<html lang="th">' +
    "<head>" +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    "<title>ใบเสนอราคา - " +
    COMPANY.name +
    "</title>" +
    "<style>" +
    "@page { size: A4 portrait; margin: 10mm; }" +
    "* { margin: 0; padding: 0; box-sizing: border-box; }" +
    'body { font-family: "Sarabun", "Noto Sans Thai", sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 10mm; }' +
    ".header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }" +
    ".company-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }" +
    ".company-address { font-size: 12px; color: #555; margin-bottom: 2px; }" +
    ".company-phone { font-size: 12px; color: #555; }" +
    ".title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }" +
    ".date { text-align: right; margin-bottom: 15px; font-size: 13px; }" +
    ".specs-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }" +
    ".specs-table th { text-align: left; padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; width: 35%; font-weight: bold; }" +
    ".specs-table td { padding: 6px 8px; border: 1px solid #ddd; }" +
    ".cost-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }" +
    ".cost-table th { text-align: left; padding: 8px; background: #f5f5f5; border: 1px solid #ddd; }" +
    ".cost-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }" +
    ".total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333 !important; }" +
    ".unit-price-row { color: #555; }" +
    ".footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }" +
    "@media print { body { padding: 0; } }" +
    "</style>" +
    "</head>" +
    "<body>" +
    '<div class="header">' +
    '<div class="company-name">' +
    COMPANY.name +
    "</div>" +
    '<div class="company-address">' +
    COMPANY.address +
    "</div>" +
    '<div class="company-phone">' +
    COMPANY.phone +
    "</div>" +
    "</div>" +
    '<div class="title">ใบเสนอราคา</div>' +
    '<div class="date">วันที่: ' +
    today +
    "</div>" +
    '<table class="specs-table">' +
    "<tr><th>ระบบพิมพ์</th><td>" +
    systemName +
    "</td></tr>" +
    "<tr><th>ประเภทสินค้า</th><td>" +
    productTypeName +
    "</td></tr>" +
    "<tr><th>ขนาด</th><td>" +
    sizeStr +
    "</td></tr>" +
    "<tr><th>วัสดุ</th><td>" +
    materialStr +
    "</td></tr>" +
    "<tr><th>จำนวนสี</th><td>" +
    colorCountStr +
    "</td></tr>" +
    "<tr><th>จำนวน</th><td>" +
    quantityStr +
    "</td></tr>" +
    "</table>" +
    '<table class="cost-table">' +
    '<thead><tr><th style="width: 60%;">รายการ</th><th style="width: 40%; text-align: right;">ข้อมูล</th></tr></thead>' +
    "<tbody>" +
    costRows +
    '<tr class="total-row"><td style="padding: 8px; border-top: 2px solid #333;">ราคารวม</td><td style="padding: 8px; border-top: 2px solid #333; text-align: right;">' +
    formatCurrency(result.totalPrice) +
    "</td></tr>" +
    '<tr class="unit-price-row"><td style="padding: 6px 8px;">ราคาต่อหน่วย</td><td style="padding: 6px 8px; text-align: right;">' +
    formatCurrency(result.unitPrice) +
    "</td></tr>" +
    "</tbody>" +
    "</table>" +
    rateTable +
    '<div class="footer">' +
    "<p>เอกสารนี้จัดทำโดยระบบคำนวณราคาอัตโนมัติ — ราคาอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งล่วงหน้า</p>" +
    "</div>" +
    "</body>" +
    "</html>"
  );
}
