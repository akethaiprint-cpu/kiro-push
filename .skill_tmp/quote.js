const PE = require('../js/pricing-engine.js');

// ── งาน: กระดาษสไลด์ (แผ่นหน้า + แผ่นหลัง) ──
const SIZE = { width: 5.5, height: 15.4 };   // ซม. (สำเร็จ)
const TIERS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000];
const MODELS = 5;                            // 5 รุ่น (เพลทแยกต่อรุ่น)

// finishing rates (บาท/ชิ้น หรือ บาท/ตร.ซม.) — อ้างอิงตารางใน storage.js + ประมาณการบางรายการ
const R = {
  laminateGloss: 0.004,   // บาท/ตร.ซม. (เคลือบลามิเนตเงา, อิงเรท box)
  foilSilver:    2.00,    // บาท/ชิ้น (ปั๊มเคเงิน ~ embossStamp)
  dieCut:        1.50,    // บาท/ชิ้น (ไดคัทตามแบบ, อิงเรท box)
  perforation:  0.30,     // บาท/ชิ้น (ปั๊มปรุ — ประมาณการ)
  holePunch:    0.20,     // บาท/ชิ้น (เจาะรู — ประมาณการ)
};
const area = SIZE.width * SIZE.height; // ตร.ซม.

function baseSpecs(qty) {
  return {
    size: SIZE,
    sheetSize: '25x36',
    quantity: qty,
    frontColors: 5,            // CMYK + น้ำเงินพิเศษ
    sides: 1,
    printMethod: 'single',
    jobType: 'fourColorFirst', // multi-color งานแรก (spoilage 10%, min 150)
    paperType: 'artBoard',
    gsm: 230,
    pressType: 'heidelberg_sm74',
    inkType: 'conventional',   // หมึกทนแสง = conventional
  };
}

function baseCost(res) {
  // ค่าเพลท + ราคาขายวัสดุ + ค่าพิมพ์ (ต่อ 1 รุ่น)
  const s = res.summary;
  return { plate: s.plateCost, paper: s.paperSellingPrice, print: s.printCost,
           total: s.plateCost + s.paperSellingPrice + s.printCost,
           sheets: s.totalSheets, nUp: s.nUp };
}

console.log('ทดสอบราคา — กระดาษสไลด์ (1 ชุด = แผ่นหน้า + แผ่นหลัง)');
console.log('วัสดุ artBoard 230g | เครื่อง SM74 | สำเร็จ 5.5×15.4 ซม. | 5 รุ่น\n');

for (const Q of TIERS) {
  const perModel = Q / MODELS;
  const front = PE.calculatePressSheet('pressSheet', baseSpecs(perModel), null);
  const back  = PE.calculatePressSheet('pressSheet', baseSpecs(perModel), null);
  if (!front.success || !back.success) { console.log(Q, 'ERROR', front.error || back.error); continue; }

  const fB = baseCost(front), bB = baseCost(back);

  // ฐานพิมพ์รวมทุกรุ่น (×5)
  const printBaseFront = fB.total * MODELS;
  const printBaseBack  = bB.total * MODELS;

  // finishing บนจำนวนรวม Q ชิ้น (ต่อชนิดแผ่น)
  // แผ่นหน้า: ลามิเนตเงา + ปั๊มเคเงิน + ไดคัท + ปรุ + เจาะรู
  const finFront = Q * (R.laminateGloss * area + R.foilSilver + R.dieCut + R.perforation + R.holePunch);
  // แผ่นหลัง: ลามิเนตเงา + ไดคัท
  const finBack  = Q * (R.laminateGloss * area + R.dieCut);

  const grand = printBaseFront + printBaseBack + finFront + finBack;
  const perSet = grand / Q;

  console.log(`▶ ${Q.toLocaleString()} ชุด  (รุ่นละ ${perModel.toLocaleString()})  n-up=${fB.nUp}/ใบ`);
  console.log(`   ฐานพิมพ์ หน้า: ${Math.round(printBaseFront).toLocaleString()}  (เพลท ${Math.round(fB.plate*MODELS).toLocaleString()} | กระดาษ ${Math.round(fB.paper*MODELS).toLocaleString()} | พิมพ์ ${Math.round(fB.print*MODELS).toLocaleString()})`);
  console.log(`   ฐานพิมพ์ หลัง: ${Math.round(printBaseBack).toLocaleString()}  (เพลท ${Math.round(bB.plate*MODELS).toLocaleString()} | กระดาษ ${Math.round(bB.paper*MODELS).toLocaleString()} | พิมพ์ ${Math.round(bB.print*MODELS).toLocaleString()})`);
  console.log(`   งานหลังพิมพ์ หน้า: ${Math.round(finFront).toLocaleString()} | หลัง: ${Math.round(finBack).toLocaleString()}`);
  console.log(`   รวมทั้งสิ้น: ${Math.round(grand).toLocaleString()} บาท   →  ราคา/ชุด ${perSet.toFixed(2)} บาท\n`);
}
