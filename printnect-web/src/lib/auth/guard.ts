/**
 * Route guard สำหรับ endpoint ที่เขียน/แก้ไขข้อมูล (ต้องเป็นผู้ดูแล)
 * ใช้ร่วมกับ token.ts (นโยบาย fail-closed)
 */
import { NextResponse } from "next/server";
import { isAuthorized, type HeaderCarrier } from "./token";

/**
 * คืน NextResponse 401 เมื่อไม่ได้รับอนุญาต, คืน null เมื่อผ่าน
 * ใช้แบบ: `const denied = requireAdmin(req); if (denied) return denied;`
 */
export function requireAdmin(req: HeaderCarrier): NextResponse | null {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "ไม่ได้รับอนุญาต — ต้องยืนยันตัวตนผู้ดูแล" },
      { status: 401 }
    );
  }
  return null;
}
