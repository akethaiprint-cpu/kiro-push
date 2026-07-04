/**
 * Session แบบ signed cookie (HMAC) — ไม่พึ่ง lib ภายนอก
 * ใช้ secret จาก SESSION_SECRET (ถ้าไม่มี → fallback ADMIN_API_TOKEN)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "thaiprintnect_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน (วินาที)

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_API_TOKEN || "";
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

/** สร้าง session token (มีวันหมดอายุในตัว) */
export function createSessionToken(maxAgeSec: number = SESSION_MAX_AGE): string {
  const payload = JSON.stringify({ exp: Date.now() + maxAgeSec * 1000 });
  const data = Buffer.from(payload).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** ตรวจ session token — คืน true เมื่อ signature ถูกต้องและยังไม่หมดอายุ */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !secret()) return false;
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
