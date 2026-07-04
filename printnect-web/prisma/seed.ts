/**
 * Prisma seed — ใส่ตารางราคาเริ่มต้น (จาก getDefaultPriceTable) เป็นเวอร์ชัน 1 (active)
 * รันด้วย `npm run db:seed` (prisma db seed → tsx prisma/seed.ts)
 * idempotent: ถ้ามีข้อมูลอยู่แล้วจะข้าม
 */
import { PrismaClient } from "@prisma/client";
import { getDefaultPriceTable } from "../src/lib/price-table/default-price-table";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.priceTable.count();
  if (count > 0) {
    console.log(`ℹ️  มีตารางราคาอยู่แล้ว (${count} เวอร์ชัน) — ข้ามการ seed`);
    return;
  }
  const data = getDefaultPriceTable();
  const record = await prisma.priceTable.create({
    data: {
      version: 1,
      data: JSON.stringify(data),
      isActive: true,
    },
  });
  console.log(`✅ seed ตารางราคาเริ่มต้น version ${record.version} (id=${record.id}) สำเร็จ`);
}

main()
  .catch((e) => {
    console.error("❌ seed ล้มเหลว:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
