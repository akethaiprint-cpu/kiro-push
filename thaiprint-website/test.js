/**
 * เทสต์สูตรราคา (node test.js) — เทียบเคส A/B/C/C2/D ตามสกิล thaiprint-website
 * เผื่อเสีย 300 ใบ/ด้าน · กระดาษคิดตามน้ำหนักใบพิมพ์เต็มใบ × markup 1.20
 */
const fs = require("fs");
const path = require("path");
function loadScript(file){
  const html = fs.readFileSync(path.join(__dirname, file), "utf8");
  const script = html.split("<script>")[1].split("</script>")[0];
  const m = { exports: {} };
  new Function("module", "document", "window", "localStorage", script)(m, undefined, {}, undefined);
  return m.exports;
}
const idx = loadScript("index.html");     // calcOffset, calcInkjet
const est = loadScript("estimate.html");  // bestQuote, quote

let pass = 0, fail = 0;
function eq(name, got, want, tol=0.02){
  const ok = Math.abs(got - want) < tol;
  console.log((ok?"✅":"❌")+" "+name+" = "+got+(ok?"":"  (คาดหวัง "+want+")"));
  ok?pass++:fail++;
}
function is(name, got, want){
  const ok = got===want;
  console.log((ok?"✅":"❌")+" "+name+" = "+got+(ok?"":"  (คาดหวัง "+want+")"));
  ok?pass++:fail++;
}

// A — สติ๊กเกอร์ PVC (UV) 10×10 4 สี 10,000 (index calcOffset, ตัด 4)
console.log("— A: สติ๊กเกอร์ PVC —");
const A = idx.calcOffset({ wcm:10,hcm:10,colors:4,qty:10000,plateKey:"cut4",ppc:0.004,ink:"uv" });
eq("A.nUp", A.nUp, 24); eq("A.sheets", A.sheets, 717); eq("A.total", A.total, 14080.00);

// B — ใบปลิว A4 4/0 อาร์ตมัน 130g 1,000 (estimate bestQuote)
console.log("— B: ใบปลิว A4 4/0 —");
const B = est.bestQuote({ wcm:21,hcm:29.7,front:4,back:0,qty:1000,matType:"paper",gsm:130,pricePerKg:32,finishing:[] });
is("B.plate", B.plateKey, "cut4"); is("B.method", B.method, "single");
eq("B.sheets", B.sheets, 550); eq("B.total", B.total, 5656.63);

// C — นามบัตร 9×5.4 4/4 อาร์ตการ์ด 260g 1,000 → กลับหน้าในตัว
console.log("— C: นามบัตร 4/4 (ควรเลือก WT) —");
const C = est.bestQuote({ wcm:9,hcm:5.4,front:4,back:4,qty:1000,matType:"paper",gsm:260,pricePerKg:39,finishing:[] });
is("C.method", C.method, "wt"); is("C.plate", C.plateKey, "cut4");
eq("C.total", C.total, 7260.08);

// C2 — ใบปลิว A4 4/1 อาร์ตมัน 130g 5,000 → Sheetwise
console.log("— C2: ใบปลิว 4/1 (ควรเลือก Sheetwise) —");
const C2 = est.bestQuote({ wcm:21,hcm:29.7,front:4,back:1,qty:5000,matType:"paper",gsm:130,pricePerKg:32,finishing:[] });
is("C2.method", C2.method, "sheetwise");
eq("C2.total", C2.total, 8881.38);

// D — ไวนิล 3×1 ม. × 5 ป้าย 1440 dpi (index calcInkjet)
console.log("— D: ไวนิล —");
const D = idx.calcInkjet({ media:"vinyl",dpi:"1440",wm:3,hm:1,qty:5,rush:false });
eq("D.total", D.total, 2250);

console.log("\nสรุป: ผ่าน "+pass+" / ล้มเหลว "+fail);
process.exit(fail?1:0);
