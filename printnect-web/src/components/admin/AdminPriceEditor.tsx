"use client";

import { useState } from "react";
import type { PriceTable } from "@/domain/pricing/types";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok"; version: number }
  | { kind: "error"; message: string };

export default function AdminPriceEditor({
  initialTable,
}: {
  initialTable: PriceTable;
}) {
  const [json, setJson] = useState(() => JSON.stringify(initialTable, null, 2));
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function reload() {
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/price-table", { cache: "no-store" });
      const data = await res.json();
      setJson(JSON.stringify(data.priceTable, null, 2));
    } catch {
      setStatus({ kind: "error", message: "โหลดราคาปัจจุบันไม่สำเร็จ" });
    }
  }

  async function save() {
    let parsed: PriceTable;
    try {
      parsed = JSON.parse(json);
    } catch {
      setStatus({ kind: "error", message: "JSON ไม่ถูกต้อง — ตรวจสอบรูปแบบอีกครั้ง" });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      // ใช้ session cookie (login แล้ว) — ไม่ต้องแนบ token เอง
      const res = await fetch("/api/price-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceTable: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data?.error ?? `บันทึกไม่สำเร็จ (HTTP ${res.status})`,
        });
        return;
      }
      setStatus({ kind: "ok", version: data.version });
    } catch {
      setStatus({ kind: "error", message: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" });
    }
  }

  const inputCls =
    "w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        กด <strong>บันทึกเวอร์ชันใหม่</strong> เพื่อสร้างตารางราคาเวอร์ชันใหม่และตั้งเป็นเวอร์ชันใช้งาน
        (ยืนยันตัวตนด้วย session ที่เข้าสู่ระบบไว้แล้ว)
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          ตารางราคา (JSON)
        </label>
        <textarea
          className={`${inputCls} h-96 font-mono text-xs`}
          value={json}
          spellCheck={false}
          onChange={(e) => setJson(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={status.kind === "saving"}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {status.kind === "saving" ? "กำลังบันทึก..." : "บันทึกเวอร์ชันใหม่"}
        </button>
        <button
          onClick={reload}
          className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          โหลดราคาปัจจุบัน
        </button>
      </div>

      {status.kind === "ok" && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-700">
          ✅ บันทึกสำเร็จ — เวอร์ชันใหม่คือ v{status.version}
        </div>
      )}
      {status.kind === "error" && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {status.message}
        </div>
      )}
    </div>
  );
}
