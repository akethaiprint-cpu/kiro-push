import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { extractBearer, isAuthorized } from "@/lib/auth/token";

/** สร้าง object จำลองที่มี headers.get() */
function fakeReq(headers: Record<string, string>) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return { headers: { get: (name: string) => lower[name.toLowerCase()] ?? null } };
}

describe("auth/password", () => {
  it("แฮชแล้ว verify ถูกต้อง", () => {
    const stored = hashPassword("s3cret!");
    expect(stored).toContain(":");
    expect(verifyPassword("s3cret!", stored)).toBe(true);
  });

  it("รหัสผ่านผิด → false", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("ค่า stored ผิดรูปแบบ → false (ไม่ throw)", () => {
    expect(verifyPassword("x", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });

  it("salt สุ่มต่างกันทุกครั้ง", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});

describe("auth/token", () => {
  const ORIGINAL = process.env.ADMIN_API_TOKEN;

  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "secret-token";
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = ORIGINAL;
  });

  it("extractBearer อ่าน Bearer token ได้", () => {
    expect(extractBearer(fakeReq({ Authorization: "Bearer abc123" }))).toBe("abc123");
    expect(extractBearer(fakeReq({ authorization: "Bearer  spaced  " }))).toBe("spaced");
    expect(extractBearer(fakeReq({}))).toBeNull();
    expect(extractBearer(fakeReq({ Authorization: "Basic xyz" }))).toBeNull();
  });

  it("isAuthorized: token ถูกต้อง → true", () => {
    expect(isAuthorized(fakeReq({ Authorization: "Bearer secret-token" }))).toBe(true);
  });

  it("isAuthorized: token ผิด → false", () => {
    expect(isAuthorized(fakeReq({ Authorization: "Bearer wrong" }))).toBe(false);
  });

  it("isAuthorized: ไม่มี header → false", () => {
    expect(isAuthorized(fakeReq({}))).toBe(false);
  });

  it("fail-closed: ไม่ตั้งค่า ADMIN_API_TOKEN → false เสมอ", () => {
    delete process.env.ADMIN_API_TOKEN;
    expect(isAuthorized(fakeReq({ Authorization: "Bearer anything" }))).toBe(false);
  });
});
