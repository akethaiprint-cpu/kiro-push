import Link from "next/link";
import AdminPriceEditor from "@/components/admin/AdminPriceEditor";
import { getActivePriceTable } from "@/lib/price-table/repository";
import { getDefaultPriceTable } from "@/lib/price-table/default-price-table";
import type { PriceTable } from "@/domain/pricing/types";

export const dynamic = "force-dynamic";

// หมายเหตุความปลอดภัย: หน้านี้ยังไม่มี auth ระดับหน้า (ใครเปิดก็เห็น editor ได้)
// แต่การ "บันทึก" ถูกป้องกันด้วย Admin Token ที่ฝั่ง API (Req 5.2)
// งานต่อไป: เพิ่ม login/session เพื่อ gate หน้า admin ทั้งหน้า
export default async function AdminPage() {
  let table: PriceTable;
  try {
    table = await getActivePriceTable();
  } catch {
    table = getDefaultPriceTable();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการราคา (Admin)</h1>
          <p className="text-sm text-gray-500">แก้ไขตารางราคาแบบ versioned</p>
        </div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← หน้าแรก
        </Link>
      </header>
      <AdminPriceEditor initialTable={table} />
    </main>
  );
}
