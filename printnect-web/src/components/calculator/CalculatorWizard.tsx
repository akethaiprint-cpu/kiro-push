"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingEngine } from "@/domain/pricing";
import type { CalculationResult, PriceTable, Specs } from "@/domain/pricing/types";
import {
  SYSTEMS,
  PRESET_SIZES,
  buildFieldSpec,
  buildSpecs,
  type FormValues,
} from "@/lib/calculator/form-config";
import { saveQuote } from "@/lib/quotation/storage";

const STEPS = [
  "กำหนดหมวดหมู่และราคา",
  "เลือกจำนวนสิ่งพิมพ์",
  "ข้อมูลสินค้า",
  "ยืนยันการสั่งซื้อ",
];

const INITIAL_CATEGORY = "industrialOffset:leaflet";

function defaults(): FormValues {
  const a4 = PRESET_SIZES.find((s) => s.key === "A4")!;
  return {
    sizePreset: "A4",
    width: String(a4.width),
    height: String(a4.height),
    depth: "5",
    quantity: "1000",
    colorCount: "4",
    frontColors: "4",
    backColors: "0",
    material: "",
    media: "",
    resolution: "",
    inkType: "",
    plateClass: "ตัด 4",
    finishing: [],
  };
}

const inputCls =
  "w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none";
const labelCls = "text-sm text-gray-600";

/** ── ดรอปดาวน์ค้นหาได้ หลายตัวเลือก (สำหรับ "หลังพิมพ์") ── */
function MultiSelect({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(q.toLowerCase())
  );
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="relative">
      <div
        className="flex min-h-[38px] flex-wrap items-center gap-1 rounded border border-gray-300 bg-gray-50 px-2 py-1"
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length === 0 && (
          <span className="px-1 text-sm text-gray-400">{placeholder}</span>
        )}
        {selected.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
          >
            {labelOf(v)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(v);
              }}
              className="text-blue-500 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg">
          <input
            autoFocus
            className="w-full border-b border-gray-100 px-3 py-2 text-sm focus:outline-none"
            placeholder="ค้นหา..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">ไม่พบตัวเลือก</div>
            )}
            {filtered.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => onToggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorWizard({
  priceTable,
}: {
  priceTable: PriceTable;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(INITIAL_CATEGORY);
  const [values, setValues] = useState<FormValues>(() => {
    const [sys, pt] = INITIAL_CATEGORY.split(":");
    const f = buildFieldSpec(sys, pt, priceTable);
    return {
      ...defaults(),
      material: f.materialOptions[0]?.value ?? "",
      media: f.mediaOptions[0]?.value ?? "",
      resolution: f.resolutionOptions[0]?.value ?? "",
    };
  });
  const [jobName, setJobName] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastSpecs, setLastSpecs] = useState<Specs | null>(null);
  const router = useRouter();

  const [system, productType] = category.split(":");
  const fields = useMemo(
    () => buildFieldSpec(system, productType, priceTable),
    [system, productType, priceTable]
  );

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((s) => ({ ...s, [k]: v }));
  }

  function onCategory(next: string) {
    setCategory(next);
    const [sys, pt] = next.split(":");
    const f = buildFieldSpec(sys, pt, priceTable);
    setValues((s) => ({
      ...s,
      material: f.materialOptions[0]?.value ?? "",
      media: f.mediaOptions[0]?.value ?? "",
      resolution: f.resolutionOptions[0]?.value ?? "",
      finishing: [],
    }));
    setResult(null);
  }

  function onPreset(key: string) {
    const p = PRESET_SIZES.find((s) => s.key === key)!;
    setValues((s) => ({
      ...s,
      sizePreset: key,
      ...(key !== "custom" ? { width: String(p.width), height: String(p.height) } : {}),
    }));
  }

  function toggleFinishing(v: string) {
    setValues((s) => ({
      ...s,
      finishing: s.finishing.includes(v)
        ? s.finishing.filter((k) => k !== v)
        : [...s.finishing, v],
    }));
  }

  function compute() {
    const specs = buildSpecs(system, fields, values);
    setLastSpecs(specs);
    setResult(PricingEngine.calculate(system, productType, specs, priceTable));
  }

  function goStep(n: number) {
    if (n === 4) compute();
    setStep(n);
  }

  function onCreateQuotation() {
    if (!result?.success || !lastSpecs) return;
    saveQuote({ system, productType, specs: lastSpecs, result });
    router.push("/quotation");
  }

  const fmt = (n: number) => PricingEngine.formatCurrency(n);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* ── Step indicator ── */}
      <div className="mb-8 flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    active
                      ? "bg-teal-500 text-white"
                      : done
                        ? "bg-teal-100 text-teal-600"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {n}
                </span>
                <span
                  className={`hidden text-sm sm:inline ${
                    active ? "font-semibold text-teal-600" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <div className="mx-2 h-px flex-1 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">เลือกและกำหนดหมวดหมู่งานพิมพ์</h2>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className={labelCls}>หมวดหมู่งานพิมพ์ *</label>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => onCategory(e.target.value)}
            >
              {SYSTEMS.map((s) => (
                <optgroup key={s.key} label={s.label}>
                  {Object.entries(s.products)
                    .filter(([pt]) => priceTable?.[s.key]?.[pt])
                    .map(([pt, plabel]) => (
                      <option key={s.key + pt} value={`${s.key}:${pt}`}>
                        {plabel}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {fields.isInkjet ? (
            <>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className={labelCls}>วัสดุ *</label>
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
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className={labelCls}>ความละเอียด *</label>
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
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <label className={labelCls}>{fields.materialLabel} *</label>
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

          {fields.needsColorCount && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className={labelCls}>ด้านหน้าพิมพ์ *</label>
                <input
                  type="number"
                  min={0}
                  max={8}
                  className={inputCls}
                  value={values.frontColors}
                  onChange={(e) => set("frontColors", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <label className={labelCls}>ด้านหลังพิมพ์</label>
                <input
                  type="number"
                  min={0}
                  max={8}
                  className={inputCls}
                  value={values.backColors}
                  onChange={(e) => set("backColors", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ขนาด */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            <label className={`${labelCls} pt-2`}>ขนาด *</label>
            <div className="space-y-2">
              <select
                className={inputCls}
                value={values.sizePreset}
                onChange={(e) => onPreset(e.target.value)}
              >
                {PRESET_SIZES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              {values.sizePreset === "custom" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="กว้าง (ซม.)"
                    value={values.width}
                    onChange={(e) => set("width", e.target.value)}
                  />
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="สูง (ซม.)"
                    value={values.height}
                    onChange={(e) => set("height", e.target.value)}
                  />
                </div>
              )}
              {fields.needsDepth && (
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ความลึก/หนา (ซม.)"
                  value={values.depth}
                  onChange={(e) => set("depth", e.target.value)}
                />
              )}
            </div>
          </div>

          {/* หลังพิมพ์ (finishing) */}
          {fields.finishingOptions.length > 0 && (
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <label className={`${labelCls} pt-2`}>หลังพิมพ์</label>
              <MultiSelect
                options={fields.finishingOptions}
                selected={values.finishing}
                onToggle={toggleFinishing}
                placeholder="โปรดเลือก หลังพิมพ์..."
              />
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={() => goStep(2)}
              className="rounded border border-teal-500 px-6 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
            >
              ขั้นตอนต่อไป ›
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">เลือกจำนวนสิ่งพิมพ์</h2>
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className={labelCls}>จำนวน (ชิ้น) *</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={values.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>
          <div className="flex justify-between pt-2">
            <button
              onClick={() => goStep(1)}
              className="rounded border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ‹ ย้อนกลับ
            </button>
            <button
              onClick={() => goStep(3)}
              className="rounded border border-teal-500 px-6 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
            >
              ขั้นตอนต่อไป ›
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">ข้อมูลสินค้า</h2>
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className={labelCls}>ชื่องาน/สินค้า</label>
            <input
              className={inputCls}
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="เช่น ใบปลิวโปรโมชัน"
            />
          </div>
          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            <label className={`${labelCls} pt-2`}>หมายเหตุ</label>
            <textarea
              className={`${inputCls} h-24`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-between pt-2">
            <button
              onClick={() => goStep(2)}
              className="rounded border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ‹ ย้อนกลับ
            </button>
            <button
              onClick={() => goStep(4)}
              className="rounded bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-600"
            >
              คำนวณราคา ›
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">ยืนยันการสั่งซื้อ</h2>

          {result && !result.success && (
            <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
              {result.error}
            </div>
          )}

          {result?.success && (
            <div className="rounded border border-gray-200 p-4">
              {jobName && (
                <div className="mb-2 text-sm text-gray-500">งาน: {jobName}</div>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {result.costBreakdown.map((it, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-600">{it.label}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {fmt(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between border-t border-gray-300 pt-3">
                <span className="font-semibold">ราคารวม</span>
                <span className="text-xl font-bold text-teal-600">
                  {fmt(result.totalPrice)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
                <span>ราคาต่อชิ้น ({result.quantity} ชิ้น)</span>
                <span className="tabular-nums">{fmt(result.unitPrice)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => goStep(3)}
              className="rounded border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ‹ ย้อนกลับ
            </button>
            {result?.success && (
              <button
                onClick={onCreateQuotation}
                className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                จัดทำใบเสนอราคา
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
