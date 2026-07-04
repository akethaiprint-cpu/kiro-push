import { describe, it, expect, beforeEach } from "vitest";
import {
  getActivePriceTable,
  getActiveRecord,
  listVersions,
  saveNewVersion,
  seedDefaultIfEmpty,
  isValidPriceTable,
  type PriceTableDb,
  type PriceTableRow,
} from "@/lib/price-table/repository";
import { getDefaultPriceTable } from "@/lib/price-table/default-price-table";

/** Fake Prisma client แบบ in-memory — ทดสอบ repository โดยไม่ต้องมี DB จริง */
function makeFakeDb(): PriceTableDb {
  const rows: PriceTableRow[] = [];
  let seq = 0;
  const db: PriceTableDb = {
    priceTable: {
      async findFirst(args: any) {
        let list = rows.slice();
        if (args?.where?.isActive !== undefined) {
          list = list.filter((r) => r.isActive === args.where.isActive);
        }
        list.sort((a, b) => b.version - a.version);
        return list[0] ?? null;
      },
      async findMany() {
        return rows.slice().sort((a, b) => b.version - a.version);
      },
      async aggregate() {
        const max = rows.reduce<number | null>(
          (m, r) => (m === null ? r.version : Math.max(m, r.version)),
          null
        );
        return { _max: { version: max } };
      },
      async updateMany(args: any) {
        let count = 0;
        for (const r of rows) {
          if (args?.where?.isActive === undefined || r.isActive === args.where.isActive) {
            Object.assign(r, args.data);
            count++;
          }
        }
        return { count };
      },
      async create(args: any) {
        const row: PriceTableRow = {
          id: `row-${++seq}`,
          version: args.data.version,
          data: args.data.data,
          isActive: args.data.isActive ?? false,
          createdAt: new Date(),
        };
        rows.push(row);
        return row;
      },
      async count() {
        return rows.length;
      },
    },
    async $transaction(fn) {
      return fn(db);
    },
  };
  return db;
}

describe("price-table repository", () => {
  let db: PriceTableDb;
  beforeEach(() => {
    db = makeFakeDb();
  });

  it("getActivePriceTable บน DB ว่าง → คืน default (มี key ระบบพิมพ์ครบ)", async () => {
    const table = await getActivePriceTable(db);
    expect(table).toHaveProperty("screen");
    expect(table).toHaveProperty("digitalOffset");
    expect(table).toHaveProperty("industrialOffset");
    expect(table).toHaveProperty("inkjet");
  });

  it("saveNewVersion เพิ่มเวอร์ชันและตั้ง active ล่าสุด", async () => {
    const data = getDefaultPriceTable();
    const v1 = await saveNewVersion(data, db);
    expect(v1.version).toBe(1);
    expect(v1.isActive).toBe(true);

    const v2 = await saveNewVersion(data, db);
    expect(v2.version).toBe(2);
    expect(v2.isActive).toBe(true);

    const active = await getActiveRecord(db);
    expect(active?.version).toBe(2);

    const versions = await listVersions(db);
    expect(versions.map((r) => r.version)).toEqual([2, 1]);
    // มีเวอร์ชัน active เดียว
    expect(versions.filter((r) => r.isActive)).toHaveLength(1);
  });

  it("getActivePriceTable หลังบันทึก → parse กลับเป็น object เดิม", async () => {
    const data = getDefaultPriceTable();
    await saveNewVersion(data, db);
    const table = await getActivePriceTable(db);
    expect(table.screen).toBeTypeOf("object");
    expect(JSON.stringify(table)).toBe(JSON.stringify(data));
  });

  it("saveNewVersion ปฏิเสธโครงสร้างไม่ถูกต้อง", async () => {
    await expect(saveNewVersion({} as any, db)).rejects.toThrow(/โครงสร้าง/);
  });

  it("seedDefaultIfEmpty สร้าง v1 เมื่อว่าง และคืน null เมื่อมีข้อมูลแล้ว", async () => {
    const seeded = await seedDefaultIfEmpty(db);
    expect(seeded?.version).toBe(1);
    expect(seeded?.isActive).toBe(true);

    const again = await seedDefaultIfEmpty(db);
    expect(again).toBeNull();
  });

  it("isValidPriceTable: default ผ่าน, ค่าว่างไม่ผ่าน", () => {
    expect(isValidPriceTable(getDefaultPriceTable())).toBe(true);
    expect(isValidPriceTable({})).toBe(false);
    expect(isValidPriceTable(null)).toBe(false);
  });
});
