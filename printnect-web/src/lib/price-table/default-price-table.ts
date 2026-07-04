/**
 * Default Price Table — พอร์ตจาก getDefaultPriceTable() ใน js/storage.js
 * ใช้เป็นค่าตั้งต้น (จะ seed ลง DB ผ่าน Prisma ใน task ถัดไป)
 */
import { StorageManager } from "./storage-legacy";
import type { PriceTable } from "@/domain/pricing/types";

/** คืนตารางราคาเริ่มต้นของทุกระบบพิมพ์ */
export function getDefaultPriceTable(): PriceTable {
  return StorageManager.getDefaultPriceTable();
}
