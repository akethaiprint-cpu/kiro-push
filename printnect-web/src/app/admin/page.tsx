import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminPriceEditor from "@/components/admin/AdminPriceEditor";
import LogoutButton from "@/components/admin/LogoutButton";
import { getActivePriceTable } from "@/lib/price-table/repository";
import { getDefaultPriceTable } from "@/lib/price-table/default-price-table";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import type { PriceTable } from "@/domain/pricing/types";

export const dynamic = "force-dynamic";

// gate ทั้งหน้าด้วย session — ไม่ login ถูกเด้งไป /login (Req 5.2)
export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) {
    redirect("/login");
  }

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
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            หน้าแรก
          </Link>
          <LogoutButton />
        </div>
      </header>
      <AdminPriceEditor initialTable={table} />
    </main>
  );
}
