"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingEngine } from "@/domain/pricing";
import type { CalculationResult, PriceTable, Specs } from "@/domain/pricing/types";
import {
  SYSTEMS,
  buildFieldSpec,
  buildSpecs,
  type FormValues,
} from "@/lib/calculator/form-config";
import { saveQuote } from "@/lib/quotation/storage";

const EMPTY: FormValues = {
  width: "10",
  height: "5",
  depth: "5",
  quantity: "1000",
  colorCount: "4",
  material: "",
  media: "",
  resolution: "",
  inkType: "",
  plateClass: "",
  finishing: [],
};

function firstProduct(systemKey: string): string {
  const sys = SYSTEMS.find((s) => s.key === systemKey)!;
  return Object.keys(sys.products)[0];
}

export default function CalculatorForm({ priceTable }: { priceTable: PriceTable }) {
  const [system, setSystem] = useState("screen");
  const [productType, setProductType] = useState(() => firstProduct("screen"));
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastSpecs, setLastSpecs] = useState<Specs | null>(null);
  const router = useRouter();

  const systemDef = SYSTEMS.find((s) => s.key === system)!;
  // แสดงเฉพาะ product ที่มีในตารางราคาจริง
  const products = useMemo(
    () =>
      Object.entries(systemDef.products).filter(
        ([key]) => priceTable?.[system]?.[key]
      ),
    [systemDef, system, priceTable]
  );

  const fields = useMemo(
    () => buildFieldSpec(system, productType, priceTable),
    [system, productType, priceTable]
  );

  // ตั้งค่า default ของ dropdown เมื่อเปลี่ยน system/productType
  useEffect(() => {
    setResult(null);
    setValues((v) => ({
      ...v,
      material: fields.materialOptions[0]?.value ?? "",
      media: fields.mediaOptions[0]?.value ?? "",
      resolution: fields.resolutionOptions[0]?.value ?? "",
      plateClass: fields.needsInkOptions ? "ตัด 4" : "",
      inkType: "",
      finishing: [],
    }));
  }, [system, productType]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function toggleFinishing(key: string) {
    setValues((v) => ({
      ...v,
      finishing: v.finishing.includes(key)
        ? v.finishing.filter((k) => k !== key)
        : [...v.finishing, key],
    }));
  }

  function onCompute() {
    const specs = buildSpecs(system, fields, values);
    setLastSpecs(specs);
    setResult(PricingEngine.calculate(system, productType, specs, priceTable));
  }

  function onCreateQuotation() {
    if (!result || !result.success || !lastSpecs) return;
    saveQuote({ system, productType, specs: lastSpecs, result });
    router.push("/quotation");
  }

  function onSystemChange(next: string) {
    setSystem(next);
    setProductType(firstProduct(next));
  }

  const fmt = (n: number) => PricingEngine.formatCurrency(n);
  const inputCls =
    "w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* ── ฟอร์ม ── */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>ระบบพิมพ์</label>
          <select
            className={inputCls}
            value={system}
            onChange={(e) => onSystemChange(e.target.value)}
          >
            {SYSTEMS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>ประเภทสินค้า</label>
          <select
            className={inputCls}
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            {products.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>กว้าง (ซม.)</label>
            <input
              type="number"
              className={inputCls}
              value={values.width}
              onChange={(e) => set("width", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>สูง (ซม.)</label>
            <input
              type="number"
              className={inputCls}
              value={values.height}
              onChange={(e) => set("height", e.target.value)}
            />
          </div>
        </div>

        {fields.needsDepth && (
          <div>
            <label className={labelCls}>ลึก/ความหนา (ซม.)</label>
            <input
              type="number"
              className={inputCls}
              value={values.depth}
              onChange={(e) => set("depth", e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>จำนวน</label>
            <input
              type="number"
              className={inputCls}
              value={values.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>
          {fields.needsColorCount && (
            <div>
              <label className={labelCls}>จำนวนสี</label>
              <input
                type="number"
                className={inputCls}
                value={values.colorCount}
                onChange={(e) => set("colorCount", e.target.value)}
              />
            </div>
          )}
        </div>

        {fields.isInkjet ? (
          <>
            <div>
              <label className={labelCls}>วัสดุ (media)</label>
              <select
                className={inputCls}
                value={values.media}
                onChange={(e) => set("media", e.target.value)}
              >
                {fields.mediaOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>ความละเอียด</label>
              <select
                className={inputCls}
                value={values.resolution}
                onChange={(e) => set("resolution", e.target.value)}
              >
                {fields.resolutionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className={labelCls}>{fields.materialLabel}</label>
            <select
              className={inputCls}
              value={values.material}
              onChange={(e) => set("material", e.target.value)}
            >
              {fields.materialOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {fields.needsInkOptions && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ชนิดหมึก</label>
              <select
                className={inputCls}
                value={values.inkType}
                onChange={(e) => set("inkType", e.target.value)}
              >
                <option value="">อัตโนมัติ (ตามวัสดุ)</option>
                <option value="conventional">คอนเวนชั่นนัล</option>
                <option value="uv">UV</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>ขนาดเพลท</label>
              <select
                className={inputCls}
                value={values.plateClass}
                onChange={(e) => set("plateClass", e.target.value)}
              >
                <option value="ตัด 4">ตัด 4 (MO)</option>
                <option value="ตัด 2">ตัด 2 (SM74)</option>
              </select>
            </div>
          </div>
        )}

        {fields.finishingOptions.length > 0 && (
          <div>
            <label className={labelCls}>งานตกแต่ง</label>
            <div className="flex flex-wrap gap-3">
              {fields.finishingOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={values.finishing.includes(o.value)}
                    onChange={() => toggleFinishing(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onCompute}
          className="w-full rounded bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          คำนวณราคา
        </button>
      </div>

      {/* ── ผลลัพธ์ ── */}
      <div>
        {!result && (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-400">
            กรอกข้อมูลแล้วกด &ldquo;คำนวณราคา&rdquo;
          </div>
        )}

        {result && !result.success && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
            {result.error}
          </div>
        )}

        {result && result.success && (
          <div className="rounded border border-gray-200 p-5">
            <h2 className="mb-3 text-lg font-semibold">ผลการคำนวณ</h2>
            <table className="w-full text-sm">
              <tbody>
                {result.costBreakdown.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">
                      {item.label}
                      {item.conditional && (
                        <span className="ml-1 text-xs text-gray-400">(เพิ่มเติม)</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmt(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between border-t border-gray-300 pt-3">
              <span className="font-semibold">ราคารวม</span>
              <span className="text-xl font-bold text-blue-700">
                {fmt(result.totalPrice)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
              <span>ราคาต่อชิ้น ({result.quantity} ชิ้น)</span>
              <span className="tabular-nums">{fmt(result.unitPrice)}</span>
            </div>
            <button
              onClick={onCreateQuotation}
              className="mt-4 w-full rounded border border-blue-600 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50"
            >
              จัดทำใบเสนอราคา
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
