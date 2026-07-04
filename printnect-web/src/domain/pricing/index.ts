/**
 * Pricing domain — public boundary (typed)
 * โดเมนบริสุทธิ์ ไม่พึ่ง framework/DB/DOM
 */
import { PricingEngine } from "./pricing-engine";
import type {
  CalculationResult,
  PriceTable,
  Specs,
  PrintingSystem,
} from "./types";

export { PricingEngine };
export * from "./types";

/**
 * จุดเข้าหลักแบบ type-safe — คำนวณราคาตามระบบพิมพ์
 */
export function calculate(
  system: PrintingSystem | string,
  productType: string,
  specs: Specs,
  priceTable: PriceTable
): CalculationResult {
  return PricingEngine.calculate(system, productType, specs, priceTable);
}
