/**
 * Price Table Repository — อ่าน/เขียนตารางราคาแบบ versioned ผ่าน Prisma
 * - เก็บข้อมูลราคาเป็น JSON string ในโมเดล PriceTable
 * - รองรับหลายเวอร์ชัน โดยมีเวอร์ชันเดียวที่ isActive=true
 * - รับ Prisma client แบบ inject ได้ (ทดสอบด้วย mock โดยไม่ต้องมี DB จริง)
 */
import { prisma } from "@/lib/prisma";
import { getDefaultPriceTable } from "./default-price-table";
import { StorageManager } from "./storage-legacy";
import type { PriceTable } from "@/domain/pricing/types";

export interface PriceTableRow {
  id: string;
  version: number;
  data: string;
  isActive: boolean;
  createdAt: Date;
}

/** interface แคบ ๆ ของ Prisma ที่ repository ใช้ (เพื่อ inject/mock ได้) */
export interface PriceTableDb {
  priceTable: {
    findFirst(args: unknown): Promise<PriceTableRow | null>;
    findMany(args?: unknown): Promise<PriceTableRow[]>;
    aggregate(args: unknown): Promise<{ _max: { version: number | null } }>;
    updateMany(args: unknown): Promise<{ count: number }>;
    create(args: unknown): Promise<PriceTableRow>;
    count(args?: unknown): Promise<number>;
  };
  $transaction<T>(fn: (tx: PriceTableDb) => Promise<T>): Promise<T>;
}

const defaultDb = prisma as unknown as PriceTableDb;

/** ตรวจโครงสร้างตารางราคาก่อนบันทึก (ใช้ validator เดิม) */
export function isValidPriceTable(data: unknown): boolean {
  return StorageManager.validatePriceTableStructure(data);
}

/** parse JSON ของ record → PriceTable (โยน error เมื่อ JSON เสีย) */
export function parseRow(row: PriceTableRow): PriceTable {
  return JSON.parse(row.data) as PriceTable;
}

/**
 * คืนตารางราคาที่ active อยู่ ; ถ้ายังไม่มีในฐานข้อมูล → คืนค่า default (Req 5.4)
 */
export async function getActivePriceTable(
  db: PriceTableDb = defaultDb
): Promise<PriceTable> {
  const row = await db.priceTable.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!row) return getDefaultPriceTable();
  return parseRow(row);
}

/** คืน record ที่ active (หรือ null ถ้ายังไม่มี) */
export async function getActiveRecord(
  db: PriceTableDb = defaultDb
): Promise<PriceTableRow | null> {
  return db.priceTable.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
}

/** รายการเวอร์ชันทั้งหมด (ใหม่สุดก่อน) */
export async function listVersions(
  db: PriceTableDb = defaultDb
): Promise<PriceTableRow[]> {
  return db.priceTable.findMany({ orderBy: { version: "desc" } });
}

/**
 * บันทึกตารางราคาเป็นเวอร์ชันใหม่ และตั้งเป็น active (ปิด active ของเวอร์ชันเก่า)
 * โยน error เมื่อโครงสร้างไม่ถูกต้อง (Req 5.1)
 */
export async function saveNewVersion(
  data: PriceTable,
  db: PriceTableDb = defaultDb
): Promise<PriceTableRow> {
  if (!isValidPriceTable(data)) {
    throw new Error("โครงสร้างตารางราคาไม่ถูกต้อง");
  }
  return db.$transaction(async (tx) => {
    const max = await tx.priceTable.aggregate({ _max: { version: true } });
    const nextVersion = (max._max.version ?? 0) + 1;
    await tx.priceTable.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    return tx.priceTable.create({
      data: {
        version: nextVersion,
        data: JSON.stringify(data),
        isActive: true,
      },
    });
  });
}

/**
 * seed ค่า default เป็นเวอร์ชัน 1 (active) ถ้าฐานข้อมูลยังว่าง (Req 5.4)
 * คืน record ที่สร้าง หรือ null ถ้ามีข้อมูลอยู่แล้ว
 */
export async function seedDefaultIfEmpty(
  db: PriceTableDb = defaultDb
): Promise<PriceTableRow | null> {
  const count = await db.priceTable.count();
  if (count > 0) return null;
  return db.priceTable.create({
    data: {
      version: 1,
      data: JSON.stringify(getDefaultPriceTable()),
      isActive: true,
    },
  });
}
