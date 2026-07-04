/**
 * Form config สำหรับหน้า calculator — data-driven จากโครง Price_Table
 * ไม่มี side effect (ใช้ได้ทั้ง server/client)
 */
import type { PriceTable, Specs } from "@/domain/pricing/types";

export interface SystemDef {
  key: string;
  label: string;
  /** ป้ายกำกับประเภทสินค้า (ภาษาไทย) — key ต้องตรงกับ Price_Table */
  products: Record<string, string>;
}

/** 4 ระบบพิมพ์หลัก + ป้ายประเภทสินค้า (คัดเฉพาะที่เป็นสินค้าจริง) */
export const SYSTEMS: SystemDef[] = [
  {
    key: "screen",
    label: "ซิลค์สกรีน",
    products: { sticker: "สติกเกอร์", box: "กล่อง", fabricBag: "ถุงผ้า", label: "ฉลาก" },
  },
  {
    key: "digitalOffset",
    label: "ดิจิทัลออฟเซ็ต",
    products: {
      sticker: "สติกเกอร์",
      label: "ฉลาก",
      boxSmall: "กล่องเล็ก",
      businessCard: "นามบัตร",
    },
  },
  {
    key: "industrialOffset",
    label: "ออฟเซ็ตอุตสาหกรรม",
    products: {
      sticker: "สติกเกอร์",
      label: "ฉลาก",
      box: "กล่อง",
      brochure: "โบรชัวร์",
      leaflet: "แผ่นพับ",
    },
  },
  {
    key: "inkjet",
    label: "อิงค์เจ็ท",
    products: {
      vinylSign: "ป้ายไวนิล",
      largeSticker: "สติกเกอร์ใหญ่",
      banner: "แบนเนอร์",
      poster: "โปสเตอร์",
    },
  },
];

export interface Option {
  value: string;
  label: string;
}

/** ขนาดสำเร็จรูป (ซม.) — เลือกจาก dropdown หรือกำหนดเอง */
export interface PresetSize {
  key: string;
  label: string;
  width: number;
  height: number;
}

export const PRESET_SIZES: PresetSize[] = [
  { key: "A3", label: "A3 (29.7 × 42 ซม.)", width: 29.7, height: 42 },
  { key: "A4", label: "A4 (21 × 29.7 ซม.)", width: 21, height: 29.7 },
  { key: "A5", label: "A5 (14.8 × 21 ซม.)", width: 14.8, height: 21 },
  { key: "A6", label: "A6 (10.5 × 14.8 ซม.)", width: 10.5, height: 14.8 },
  { key: "B4", label: "B4 (25 × 35.3 ซม.)", width: 25, height: 35.3 },
  { key: "B5", label: "B5 (17.6 × 25 ซม.)", width: 17.6, height: 25 },
  { key: "namecard", label: "นามบัตร (9 × 5.4 ซม.)", width: 9, height: 5.4 },
  { key: "postcard", label: "โปสการ์ด (10 × 15 ซม.)", width: 10, height: 15 },
  { key: "custom", label: "กำหนดขนาดเอง", width: 0, height: 0 },
];

export interface FieldSpec {
  isInkjet: boolean;
  needsColorCount: boolean;
  needsDepth: boolean;
  needsInkOptions: boolean; // industrialOffset sticker/label: inkType + plateClass
  materialLabel: string; // "วัสดุ" / "กระดาษ" ฯลฯ
  materialOptions: Option[];
  mediaOptions: Option[]; // inkjet
  resolutionOptions: Option[]; // inkjet
  finishingOptions: Option[];
}

function toOptions(obj: Record<string, { name?: string }> | undefined): Option[] {
  if (!obj) return [];
  return Object.entries(obj).map(([value, v]) => ({
    value,
    label: v?.name ?? value,
  }));
}

const RESOLUTION_LABELS: Record<string, string> = {
  "720dpi": "720 dpi (มาตรฐาน)",
  "1440dpi": "1440 dpi (คมชัดสูง)",
};

/** สร้างคำอธิบายฟิลด์จากโครงราคาของ system+productType ที่เลือก */
export function buildFieldSpec(
  system: string,
  productType: string,
  priceTable: PriceTable
): FieldSpec {
  const productTable = priceTable?.[system]?.[productType] ?? {};
  const isInkjet = system === "inkjet";
  const needsColorCount = system === "screen" || system === "industrialOffset";
  const needsDepth = productType === "box" || productType === "boxSmall";
  const needsInkOptions =
    system === "industrialOffset" &&
    (productType === "sticker" || productType === "label");

  const materialsObj = productTable.materials ?? productTable.paperTypes;

  return {
    isInkjet,
    needsColorCount,
    needsDepth,
    needsInkOptions,
    materialLabel: productType === "box" ? "กระดาษ" : "วัสดุ",
    materialOptions: toOptions(materialsObj),
    mediaOptions: toOptions(productTable.media),
    resolutionOptions: (productTable.pricePerSqM
      ? Object.keys(productTable.pricePerSqM)
      : []
    ).map((r) => ({ value: r, label: RESOLUTION_LABELS[r] ?? r })),
    finishingOptions: toOptions(productTable.finishing),
  };
}

/** ค่าที่ผู้ใช้กรอกในฟอร์ม (string จาก input) */
export interface FormValues {
  sizePreset: string; // key ของ PRESET_SIZES ("custom" = กรอกเอง)
  width: string;
  height: string;
  depth: string;
  quantity: string;
  colorCount: string;
  frontColors: string; // สีด้านหน้า
  backColors: string; // สีด้านหลัง
  material: string;
  media: string;
  resolution: string;
  inkType: string; // "" = auto
  plateClass: string;
  finishing: string[];
}

/** แปลงค่าฟอร์ม → Specs สำหรับ PricingEngine.calculate */
export function buildSpecs(
  system: string,
  fields: FieldSpec,
  v: FormValues
): Specs {
  const specs: Specs = {
    size: {
      width: Number(v.width),
      height: Number(v.height),
      ...(fields.needsDepth ? { depth: Number(v.depth) } : {}),
    },
    quantity: Number(v.quantity),
    finishing: v.finishing,
  };

  if (fields.isInkjet) {
    specs.media = v.media;
    specs.resolution = v.resolution;
  } else {
    specs.material = v.material;
  }
  if (fields.needsColorCount) {
    // รวมสีหน้า+หลังเป็น colorCount เดียว (โมเดล perSideCombined ของระบบ Offset/สกรีน)
    const front = Number(v.frontColors) || Number(v.colorCount) || 0;
    const back = Number(v.backColors) || 0;
    const total = front + back;
    specs.colorCount = total > 0 ? total : 1;
    specs.frontColors = front;
    specs.backColors = back;
  }
  if (fields.needsInkOptions) {
    if (v.inkType === "uv" || v.inkType === "conventional") specs.inkType = v.inkType;
    if (v.plateClass) specs.plateClass = v.plateClass;
  }
  return specs;
}
