import Link from "next/link";
import CalculatorWizard from "@/components/calculator/CalculatorWizard";
import { getActivePriceTable } from "@/lib/price-table/repository";
import { getDefaultPriceTable } from "@/lib/price-table/default-price-table";
import type { PriceTable } from "@/domain/pricing/types";

// อ่านตารางราคาจาก DB ตอน request (กัน prerender ตอน build)
export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  let priceTable: PriceTable;
  try {
    priceTable = await getActivePriceTable();
  } catch {
    // ถ้า DB ไม่พร้อม → ใช้ค่า default เพื่อให้เครื่องคำนวณยังทำงานได้
    priceTable = getDefaultPriceTable();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">คำนวณราคางานพิมพ์</h1>
          <p className="text-sm text-gray-500">ไทยพริ้นท์ อินเตอร์กรุ๊ป</p>
        </div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← หน้าแรก
        </Link>
      </header>
      <CalculatorWizard priceTable={priceTable} />
    </main>
  );
}
