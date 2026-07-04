/**
 * Password hashing — scrypt (node:crypto), timing-safe verify
 * ใช้สำหรับเก็บ User.passwordHash (หน้า admin login ในอนาคต)
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

/** แฮชรหัสผ่านเป็นรูปแบบ `salt:hash` (hex) */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** ตรวจรหัสผ่านกับค่าที่เก็บไว้ (timing-safe) */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== "string") return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, KEYLEN);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}
