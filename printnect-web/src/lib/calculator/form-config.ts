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
  width: string;
  height: string;
  depth: string;
  quantity: string;
  colorCount: string;
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
  if (fields.needsColorCount) specs.colorCount = Number(v.colorCount);
  if (fields.needsInkOptions) {
    if (v.inkType === "uv" || v.inkType === "conventional") specs.inkType = v.inkType;
    if (v.plateClass) specs.plateClass = v.plateClass;
  }
  return specs;
}
