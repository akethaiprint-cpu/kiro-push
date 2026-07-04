import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";
import { checkAdminPassword } from "@/lib/auth/token";

describe("auth/session", () => {
  const ORIGINAL = process.env.ADMIN_API_TOKEN;
  beforeEach(() => {
    delete process.env.SESSION_SECRET;
    process.env.ADMIN_API_TOKEN = "session-secret";
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = ORIGINAL;
  });

  it("token ที่สร้างแล้ว verify ผ่าน", () => {
    const t = createSessionToken();
    expect(verifySessionToken(t)).toBe(true);
  });

  it("token ที่ถูกแก้ (tamper) → false", () => {
    const t = createSessionToken();
    const tampered = t.slice(0, -2) + (t.endsWith("00") ? "11" : "00");
    expect(verifySessionToken(tampered)).toBe(false);
  });

  it("token หมดอายุ → false", () => {
    const expired = createSessionToken(-10); // exp อยู่ในอดีต
    expect(verifySessionToken(expired)).toBe(false);
  });

  it("ค่าว่าง/รูปแบบผิด → false", () => {
    expect(verifySessionToken("")).toBe(false);
    expect(verifySessionToken("abc")).toBe(false);
    expect(verifySessionToken(null)).toBe(false);
  });

  it("ไม่มี secret → false (fail-closed)", () => {
    delete process.env.ADMIN_API_TOKEN;
    const t = createSessionToken();
    expect(verifySessionToken(t)).toBe(false);
  });
});

describe("auth/checkAdminPassword", () => {
  const ORIGINAL_TOKEN = process.env.ADMIN_API_TOKEN;
  const ORIGINAL_PW = process.env.ADMIN_PASSWORD;
  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_PW === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = ORIGINAL_PW;
  });

  it("ตรงกับ ADMIN_PASSWORD → true", () => {
    process.env.ADMIN_PASSWORD = "hunter2secret";
    expect(checkAdminPassword("hunter2secret")).toBe(true);
    expect(checkAdminPassword("wrong")).toBe(false);
  });

  it("fallback เป็น ADMIN_API_TOKEN เมื่อไม่มี ADMIN_PASSWORD", () => {
    delete process.env.ADMIN_PASSWORD;
    process.env.ADMIN_API_TOKEN = "tok-abc";
    expect(checkAdminPassword("tok-abc")).toBe(true);
  });

  it("ไม่ตั้งค่าอะไรเลย → false", () => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_API_TOKEN;
    expect(checkAdminPassword("anything")).toBe(false);
  });
});
