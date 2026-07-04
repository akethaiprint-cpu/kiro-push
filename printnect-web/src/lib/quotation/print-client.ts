"use client";

/**
 * เปิด print dialog สำหรับใบเสนอราคา (browser-only)
 * พอร์ตพฤติกรรมจาก QuotationPrinter.print() เดิม — สร้าง iframe ซ่อนแล้วสั่ง print
 */
import { generateQuotationHTML, type MultiItem } from "@/domain/quotation";
import type { CalculationResult, Specs } from "@/domain/pricing/types";

export function printQuotation(
  result: CalculationResult,
  specs: Specs,
  multiItems?: MultiItem[]
): void {
  if (!result || !result.success) return;
  const html = generateQuotationHTML(result, specs, multiItems);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };
}
