/**
 * Admin token authorization (pure) — ไม่พึ่ง next/server เพื่อให้ทดสอบง่าย
 * นโยบาย fail-closed: ถ้าไม่ตั้งค่า ADMIN_API_TOKEN จะปฏิเสธทุกคำขอเขียน
 */
import { timingSafeEqual } from "node:crypto";

/** อ็อบเจกต์ใด ๆ ที่มี headers.get() (เช่น Request/NextRequest) */
export interface HeaderCarrier {
  headers: { get(name: string): string | null };
}

/** อ่าน token ผู้ดูแลจาก environment */
export function getAdminToken(): string | undefined {
  return process.env.ADMIN_API_TOKEN;
}

/** ดึง Bearer token จาก header Authorization */
export function extractBearer(req: HeaderCarrier): string | null {
  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** เทียบ string แบบ timing-safe */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** รหัสผ่านสำหรับ login หน้า admin (ADMIN_PASSWORD หรือ fallback ADMIN_API_TOKEN) */
export function getAdminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_API_TOKEN;
}

/** ตรวจรหัสผ่าน login (timing-safe) — fail-closed ถ้าไม่ได้ตั้งค่า */
export function checkAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
}

/** true เมื่อคำขอมีสิทธิ์ผู้ดูแล */
export function isAuthorized(req: HeaderCarrier): boolean {
  const token = getAdminToken();
  if (!token) return false; // fail-closed: ยังไม่ตั้งค่า token → ปฏิเสธ
  const provided = extractBearer(req);
  if (!provided) return false;
  return safeEqual(provided, token);
}
