/**
 * /api/price-table
 * - GET  : อ่านตารางราคาที่ active (public — เครื่องคำนวณต้องใช้ราคา)
 * - POST : บันทึกตารางราคาเวอร์ชันใหม่ (ต้องยืนยันตัวตนผู้ดูแล — Req 5.2)
 *
 * ความปลอดภัย: การเขียนถูกป้องกันด้วย requireAdmin (fail-closed).
 * GET เปิดสาธารณะโดยเจตนา เพื่อให้สอดคล้องกับเว็บเดิมที่ฝังตารางราคาไว้ฝั่ง client อยู่แล้ว
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getActivePriceTable,
  saveNewVersion,
} from "@/lib/price-table/repository";
import type { PriceTable } from "@/domain/pricing/types";

// ป้องกันการ prerender ตอน build (มีการเข้าถึง DB ตอน request)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const priceTable = await getActivePriceTable();
    return NextResponse.json({ priceTable });
  } catch {
    return NextResponse.json(
      { error: "โหลดตารางราคาไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const data = ((body as { priceTable?: PriceTable })?.priceTable ??
    body) as PriceTable;

  try {
    const record = await saveNewVersion(data);
    return NextResponse.json(
      { ok: true, version: record.version, id: record.id },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
