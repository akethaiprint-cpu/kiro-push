/**
 * Domain types สำหรับ Pricing_Engine (PrintNect)
 * ใช้ type ตรงกับโครงข้อมูลใน js/pricing-engine.js เดิม
 */

export interface Dimensions {
  width: number;
  height: number;
  depth?: number;
}

/** รายการในตารางราคาแบบขั้น (tier) — โครงตามระบบย่อยต่าง ๆ */
export interface Tier {
  min?: number;
  max?: number;
  upTo?: number;
  minQty?: number;
  maxQty?: number;
  price?: number;
  pricePerUnit?: number;
  pricePerSheet?: number;
  flatRate?: number;
  overageRate?: number;
  [key: string]: unknown;
}

/** สเปกเครื่องพิมพ์ (MACHINE_SPECS) */
export interface MachineSpec {
  name: string;
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
  minHeight: number;
  plateCostPerColor: number;
  plateSize: string;
  hint?: string;
}

/** ผลการตัดกระดาษ 1 แผน (PaperCuttingOptimizer) */
export interface CutResult {
  rows: number;
  cols: number;
  cutsPerSheet: number;
  cutWidth: number;
  cutHeight: number;
  wasteCm2: number;
  compatibleMachines: string[];
  machineUnusedCm2: number | null;
  recommended: boolean;
}

/** รายการในรายละเอียดราคา (cost breakdown) */
export interface CostItem {
  label: string;
  amount: number;
  conditional: boolean;
}

/** ผลลัพธ์การคำนวณราคา — โครงตรงกับเว็บเดิม */
export interface CalculationResult {
  success: boolean;
  system: string;
  productType: string;
  costBreakdown: CostItem[];
  totalPrice: number;
  unitPrice: number;
  quantity: number;
  error: string | null;
  summary?: Record<string, unknown>;
}

/** ข้อมูลสเปกงานที่ป้อนเข้าเครื่องคำนวณ */
export interface Specs {
  size: Dimensions;
  quantity: number;
  material?: string;
  colorCount?: number;
  finishing?: string[];
  printMethod?: string;
  printSides?: number;
  sheetSize?: string;
  gsm?: number;
  pressType?: string;
  inkType?: string;
  sides?: 1 | 2;
  frontColors?: number;
  backColors?: number;
  jobType?: string;
  resolution?: string;
  media?: string;
  plateCostTableMode?: "legacy" | "datasheet2025";
  [key: string]: unknown;
}

/** โครงตารางราคาทั้งระบบ (loose ในช่วงพอร์ต — ตรงกับ JSON เดิม) */
export type PriceTable = Record<string, any>;

/** ระบบพิมพ์ที่รองรับ */
export type PrintingSystem =
  | "screen"
  | "digitalOffset"
  | "industrialOffset"
  | "inkjet"
  | "paperCalc"
  | "pressSheet";
