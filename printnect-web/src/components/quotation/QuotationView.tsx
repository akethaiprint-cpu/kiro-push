"use client";

import Link from "next/link";
import { PricingEngine } from "@/domain/pricing";
import {
  COMPANY,
  QUOTATION_SYSTEM_NAMES,
  QUOTATION_PRODUCT_NAMES,
  formatThaiDate,
} from "@/domain/quotation";
import { printQuotation } from "@/lib/quotation/print-client";
import type { StoredQuote } from "@/lib/quotation/storage";

export default function QuotationView({ quote }: { quote: StoredQuote }) {
  const { result, specs } = quote;
  const fmt = (n: number) => PricingEngine.formatCurrency(n);
  const systemName = QUOTATION_SYSTEM_NAMES[result.system] ?? result.system;
  const productName =
    QUOTATION_PRODUCT_NAMES[result.productType] ?? result.productType;

  const sizeStr = specs?.size
    ? specs.size.depth
      ? `${specs.size.width} x ${specs.size.height} x ${specs.size.depth} ซม.`
      : `${specs.size.width} x ${specs.size.height} ซม.`
    : "-";

  const rows: Array<[string, string]> = [
    ["ระบบพิมพ์", systemName],
    ["ประเภทสินค้า", productName],
    ["ขนาด", sizeStr],
    ["วัสดุ", (specs?.material as string) || (specs?.media as string) || "-"],
    ["จำนวนสี", specs?.colorCount ? `${specs.colorCount} สี` : "-"],
    ["จำนวน", result.quantity ? `${result.quantity.toLocaleString()} ชิ้น` : "-"],
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/calculator" className="text-sm text-blue-600 hover:underline">
          ← กลับไปคำนวณ
        </Link>
        <button
          onClick={() => printQuotation(result, specs)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          พิมพ์ใบเสนอราคา
        </button>
      </div>

      <div className="rounded border border-gray-200 bg-white p-8">
        <div className="border-b-2 border-gray-800 pb-4 text-center">
          <div className="text-xl font-bold">{COMPANY.name}</div>
          <div className="mt-1 text-xs text-gray-600">{COMPANY.address}</div>
          <div className="text-xs text-gray-600">{COMPANY.phone}</div>
        </div>

        <h1 className="my-5 text-center text-lg font-bold">ใบเสนอราคา</h1>
        <div className="mb-4 text-right text-sm">
          วันที่: {formatThaiDate(new Date())}
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th className="w-2/5 border border-gray-300 bg-gray-50 px-2 py-1.5 text-left font-semibold">
                  {k}
                </th>
                <td className="border border-gray-300 px-2 py-1.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 px-2 py-2 text-left">
                รายการ
              </th>
              <th className="border border-gray-300 bg-gray-50 px-2 py-2 text-right">
                ข้อมูล
              </th>
            </tr>
          </thead>
          <tbody>
            {result.costBreakdown
              .filter((it) => !(it.conditional && it.amount <= 0))
              .map((it, i) => (
                <tr key={i}>
                  <td className="border-b border-gray-100 px-2 py-1.5 text-gray-600">
                    {it.label}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1.5 text-right tabular-nums">
                    {fmt(it.amount)}
                  </td>
                </tr>
              ))}
            <tr className="font-bold">
              <td className="border-t-2 border-gray-800 px-2 py-2">ราคารวม</td>
              <td className="border-t-2 border-gray-800 px-2 py-2 text-right tabular-nums">
                {fmt(result.totalPrice)}
              </td>
            </tr>
            <tr className="text-gray-500">
              <td className="px-2 py-1.5">ราคาต่อหน่วย</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {fmt(result.unitPrice)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 border-t border-gray-200 pt-3 text-center text-[11px] text-gray-400">
          เอกสารนี้จัดทำโดยระบบคำนวณราคาอัตโนมัติ — ราคาอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งล่วงหน้า
        </p>
      </div>
    </div>
  );
}
