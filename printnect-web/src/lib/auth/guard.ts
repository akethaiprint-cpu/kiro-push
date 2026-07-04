/**
 * Route guard สำหรับ endpoint ที่เขียน/แก้ไขข้อมูล (ต้องเป็นผู้ดูแล)
 * อนุญาตเมื่อ: มี session cookie ที่ถูกต้อง (login ผ่านหน้าเว็บ) หรือ Bearer token (automation/API)
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "./token";
import { verifySessionToken, SESSION_COOKIE } from "./session";

/**
 * คืน NextResponse 401 เมื่อไม่ได้รับอนุญาต, คืน null เมื่อผ่าน
 * ใช้แบบ: `const denied = requireAdmin(req); if (denied) return denied;`
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const bearerOk = isAuthorized(req);
  const sessionOk = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!bearerOk && !sessionOk) {
    return NextResponse.json(
      { error: "ไม่ได้รับอนุญาต — กรุณาเข้าสู่ระบบผู้ดูแล" },
      { status: 401 }
    );
  }
  return null;
}
