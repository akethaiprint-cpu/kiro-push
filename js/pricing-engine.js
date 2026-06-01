/**
 * Pricing Engine — Pure Calculation Logic
 * ไม่มี side effects, ทดสอบได้ง่าย
 * Module Pattern (object literal) for browser, also export for Vitest testing
 */
const PricingEngine = {
  /**
   * Press machine specifications — ขนาดรับกระดาษและค่าเพลท
   * Used by calculatePressSheet to validate paper fit and compute plate cost.
   * Canonical_Orientation: maxWidth ≥ maxHeight AND minWidth ≥ minHeight สำหรับทุก entry
   * @typedef {object} MachineSpec
   * @property {string} name - Display name
   * @property {number} maxWidth - Max paper width in cm (canonical: ≥ maxHeight)
   * @property {number} maxHeight - Max paper height in cm
   * @property {number} minWidth - Min paper width in cm (canonical: ≥ minHeight)
   * @property {number} minHeight - Min paper height in cm
   * @property {number} plateCostPerColor - Plate cost per color in baht
   * @property {string} [hint] - Optional hint shown when paper doesn't fit
   */
  MACHINE_SPECS: {
    'heidelberg_gto46': { name: 'Heidelberg GTO 46',           maxWidth: 46,  maxHeight: 34,   minWidth: 14.8, minHeight: 10.5, plateCostPerColor: 200, plateSize: 'ตัด 8 (เล็ก)', hint: 'งานเล็ก ปริมาณน้อย รับ 14.8×10.5 ถึง 46×34 ซม.' },
    'heidelberg_gto52': { name: 'Heidelberg GTO 52',           maxWidth: 52,  maxHeight: 36,   minWidth: 18,   minHeight: 10.5, plateCostPerColor: 250, plateSize: 'ตัด 4',        hint: 'งานเล็ก A3+ รับ 18×10.5 ถึง 52×36 ซม.' },
    'heidelberg_mo':    { name: 'Heidelberg MO (MOZ/MOV)',     maxWidth: 65,  maxHeight: 48,   minWidth: 28,   minHeight: 21,   plateCostPerColor: 300, plateSize: 'ตัด 4 (B2)',   hint: 'B2 นิยมในไทย รับ 28×21 ถึง 65×48 ซม. (เช่น 19×25 นิ้ว)' },
    'heidelberg_movp':  { name: 'Heidelberg MOVP (Perfector)', maxWidth: 65,  maxHeight: 48,   minWidth: 28,   minHeight: 21,   plateCostPerColor: 300, plateSize: 'ตัด 4 (B2)',   hint: 'Perfector พิมพ์ 2 ด้านรอบเดียว รับ 28×21 ถึง 65×48 ซม.' },
    'heidelberg_sm52':  { name: 'Heidelberg SM52',             maxWidth: 52,  maxHeight: 37,   minWidth: 14.5, minHeight: 10.5, plateCostPerColor: 250, plateSize: 'ตัด 8 (กลาง)', hint: 'รับ 14.5×10.5 ถึง 52×37 ซม.' },
    'heidelberg_sx52':  { name: 'Heidelberg SX52',             maxWidth: 52,  maxHeight: 37,   minWidth: 14.5, minHeight: 10.5, plateCostPerColor: 450, plateSize: 'ตัด 2',        hint: 'B2 รับ 14.5×10.5 ถึง 52×37 ซม.' },
    'heidelberg_sm74':  { name: 'Heidelberg SM74',             maxWidth: 74,  maxHeight: 53,   minWidth: 28,   minHeight: 21,   plateCostPerColor: 500, plateSize: 'ตัด 2 (B2+)',  hint: 'B2+ สมรรถนะสูง รับ 28×21 ถึง 74×53 ซม. (เช่น 24×35, 25×36 นิ้ว)' },
    'heidelberg_sx74':  { name: 'Heidelberg SX74',             maxWidth: 74,  maxHeight: 53,   minWidth: 28,   minHeight: 21,   plateCostPerColor: 500, plateSize: 'ตัด 2',        hint: 'B2+ สมรรถนะสูง รับ 28×21 ถึง 74×53 ซม.' },
    'heidelberg_xl75':  { name: 'Heidelberg XL75',             maxWidth: 74,  maxHeight: 58.5, minWidth: 35,   minHeight: 28,   plateCostPerColor: 550, plateSize: 'ตัด 2',        hint: 'B2+ XL series รับ 35×28 ถึง 74×58.5 ซม.' },
    'heidelberg_cd102': { name: 'Heidelberg CD102 / XL102',    maxWidth: 102, maxHeight: 72,   minWidth: 48,   minHeight: 34,   plateCostPerColor: 600, plateSize: 'ตัด 1 (B1)',   hint: 'B1 รับ 48×34 ถึง 102×72 ซม. (เช่น 31×43 นิ้ว)' },
    'heidelberg_sx102': { name: 'Heidelberg SX102',            maxWidth: 102, maxHeight: 72,   minWidth: 48,   minHeight: 34,   plateCostPerColor: 650, plateSize: 'ตัด 1',        hint: 'B1 รับ 48×34 ถึง 102×72 ซม.' },
    'heidelberg_xl106': { name: 'Heidelberg XL106',            maxWidth: 105, maxHeight: 75,   minWidth: 48,   minHeight: 34,   plateCostPerColor: 700, plateSize: 'ตัด 1',        hint: 'B1 สมรรถนะสูงสุด รับ 48×34 ถึง 105×75 ซม.' },
    'komori_s40':       { name: 'Komori Lithrone S40',         maxWidth: 106, maxHeight: 75,   minWidth: 48,   minHeight: 34,   plateCostPerColor: 700, plateSize: 'ตัด 1 (B1)',   hint: 'B1 สมรรถนะสูงสุด รับ 48×34 ถึง 106×75 ซม.' },
  },

  /**
   * Legacy plate cost — ค่าเดิมที่อยู่ใน MACHINE_SPECS.plateCostPerColor
   * Req 14.1
   */
  PLATE_COST_LEGACY: {
    heidelberg_gto46: 200,  heidelberg_gto52: 250,
    heidelberg_mo:    300,  heidelberg_movp:  300,
    heidelberg_sm52:  250,  heidelberg_sx52:  450,
    heidelberg_sm74:  500,  heidelberg_sx74:  500,
    heidelberg_xl75:  550,
    heidelberg_cd102: 600,  heidelberg_sx102: 650,
    heidelberg_xl106: 700,  komori_s40:       700,
  },

  /**
   * Datasheet 2025 — ค่าจริงตามที่โรงพิมพ์ใช้
   * Req 14.1
   */
  PLATE_COST_DATASHEET2025: {
    heidelberg_gto46: 150,  heidelberg_gto52: 150,
    heidelberg_mo:    300,  heidelberg_movp:  300,
    heidelberg_sm52:  150,  heidelberg_sx52:  150,
    heidelberg_sm74:  500,  heidelberg_sx74:  500,
    heidelberg_xl75:  600,
    heidelberg_cd102: 600,  heidelberg_sx102: 600,
    heidelberg_xl106: 1000, komori_s40:       1000,
  },

  /**
   * Get active plate cost table from localStorage
   * Req 14.2, 14.3 — default 'legacy', user สลับโดย localStorage.setItem('tp_plateCostTableMode', 'datasheet2025')
   * @returns {{name:'legacy'|'datasheet2025', table:object}}
   */
  getActivePlateCostTable() {
    try {
      if (typeof localStorage !== 'undefined') {
        const mode = localStorage.getItem('tp_plateCostTableMode');
        if (mode === 'datasheet2025') return { name: 'datasheet2025', table: this.PLATE_COST_DATASHEET2025 };
      }
    } catch (e) { /* fallback below */ }
    return { name: 'legacy', table: this.PLATE_COST_LEGACY };
  },

  /**
   * ตารางค่าพิมพ์ Heidelberg ตามขนาดเพลทและประเภทหมึก
   * Indexed by: plateClass → inkType → tier
   * tier: { upTo: number|Infinity, flatRate: number, overageRate: number }
   *   - flatRate: เหมาต่อสี (บาท) ในช่วงนี้
   *   - overageRate: ราคาต่อใบส่วนเกิน (บาท/ใบ/สี) เมื่อข้าม upTo
   */
  PRINT_COST_TABLE: {
    'ตัด 4': {
      conventional: [
        { upTo: 10000,    flatRate: 900,  overageRate: 0    },
        { upTo: Infinity, flatRate: 900,  overageRate: 0.10 },
      ],
      uv: [
        { upTo: 1000,     flatRate: 1500, overageRate: 0    },
        { upTo: Infinity, flatRate: 1500, overageRate: 1.00 },
      ],
    },
    'ตัด 2': {
      conventional: [
        { upTo: 10000,    flatRate: 1200, overageRate: 0    },
        { upTo: Infinity, flatRate: 1200, overageRate: 0.20 },
      ],
      uv: [
        { upTo: 10000,    flatRate: 2000, overageRate: 0    },
        { upTo: Infinity, flatRate: 2000, overageRate: 1.50 },
      ],
    },
  },

  /**
   * Spoilage Profiles — กำหนดอัตรากระดาษเสียและขั้นต่ำตามประเภทงาน
   * Req 12.1–12.6
   */
  SPOILAGE_PROFILES: {
    oneColorRepeat:  { label: '1 สี ซ้ำ',                rate: 0.03, minSheets: 50  },
    twoColorGeneral: { label: '2 สี ทั่วไป',              rate: 0.05, minSheets: 100 },
    fourColorRepeat: { label: '4 สี ซ้ำ',                rate: 0.08, minSheets: 100 },
    fourColorFirst:  { label: '4 สี ครั้งแรก',            rate: 0.10, minSheets: 150 },
    uvOrPantone:     { label: 'UV / Pantone',           rate: 0.10, minSheets: 100 },
    specialPaper:    { label: 'กระดาษพิเศษ (สติ๊กเกอร์/PVC)', rate: 0.15, minSheets: 150 },
  },

  /**
   * Sticker_Material price per square centimeter (บาท/ตร.ซม.)
   * ใช้คิดต้นทุนวัสดุสติกเกอร์ตามพื้นที่ (Req 4.4, 4.8)
   * อ้างอิงราคาสติกเกอร์ในระบบสกรีน/industrialOffset (storage.js)
   */
  STICKER_PRICE_PER_SQCM: {
    pvcSticker:   0.010,
    ppSticker:    0.008,
    petSticker:   0.012,
    paperSticker: 0.005,
  },

  /**
   * ชื่อแสดงผลของวัสดุสติกเกอร์ (ใช้ใน cost breakdown)
   */
  STICKER_LABEL: {
    pvcSticker:   'สติกเกอร์ PVC',
    ppSticker:    'สติกเกอร์ PP',
    petSticker:   'สติกเกอร์ PET',
    paperSticker: 'สติกเกอร์กระดาษ',
  },

  /**
   * Default Ink_Type per material — สติกเกอร์ทั้งหมดใช้หมึก UV เริ่มต้น (Req 4.2, 4.5)
   */
  MATERIAL_INK_DEFAULT: {
    pvcSticker:   'uv',
    ppSticker:    'uv',
    petSticker:   'uv',
    paperSticker: 'conventional',
  },

  /**
   * คืน true เมื่อ materialKey เป็นวัสดุสติกเกอร์ (มีใน STICKER_PRICE_PER_SQCM)
   * Req 4.3, 4.4
   * @param {string} materialKey
   * @returns {boolean}
   */
  _isStickerMaterial(materialKey) {
    return Object.prototype.hasOwnProperty.call(this.STICKER_PRICE_PER_SQCM, materialKey);
  },

  /**
   * คืนราคาวัสดุต่อ ตร.ซม. — รองรับ 2 แบบ
   * (1) วัสดุปกติ: ใช้ pricePerSqCm ที่กำหนดไว้ตรงๆ
   * (2) แผ่นพลาสติกไม่มีกาว: คิดจากน้ำหนัก
   *     ราคา/ตร.ซม. = (ความหนา_ซม. × ค่าถ่วง × ราคา/กก.) ÷ 1000
   *     โดย ความหนา_ซม. = thicknessMm ÷ 10
   *     (มี field: density [g/cm³], thicknessMm [มม.], pricePerKg [บาท/กก.])
   * @param {object} materialData
   * @returns {number|null} ราคาต่อ ตร.ซม. หรือ null ถ้าข้อมูลไม่พอ
   */
  _materialPricePerSqCm(materialData) {
    if (!materialData) return null;
    // แผ่นพลาสติกคิดตามน้ำหนัก
    if (materialData.density && materialData.thicknessMm && materialData.pricePerKg) {
      const thicknessCm = materialData.thicknessMm / 10;
      // น้ำหนักต่อ 1 ตร.ซม. (กรัม) = พื้นที่(1) × ความหนา_ซม. × ค่าถ่วง
      const gramsPerSqCm = thicknessCm * materialData.density;
      // ราคา/ตร.ซม. = น้ำหนัก(กรัม) ÷ 1000 × ราคา/กก.
      return (gramsPerSqCm / 1000) * materialData.pricePerKg;
    }
    if (typeof materialData.pricePerSqCm === 'number') {
      return materialData.pricePerSqCm;
    }
    return null;
  },

  /**
   * Legacy Job_Type mapping — รองรับ saved quotations จาก spec ก่อนๆ
   * Req 12.11
   */
  LEGACY_JOB_TYPE_MAP: {
    simple:         'twoColorGeneral',
    fourColor:      'fourColorRepeat',
    newJob:         'fourColorFirst',
    // 'fourColorFirst' จาก enhancement ก่อน → key เดียวกัน (no-op)
  },

  /**
   * Perfecting modifier (Req 13.1, 13.4)
   */
  PERFECTING_MODIFIER_DEFAULT: 0.025,  // 2.5% midpoint of 2-3%
  PERFECTING_MODIFIER_MIN: 0.02,
  PERFECTING_MODIFIER_MAX: 0.03,

  /**
   * Quick Select — แนะนำเครื่อง/วิธีพิมพ์/จำนวนสีที่เหมาะสม
   * Pure functions ไม่มี side effects, ไม่แตะ DOM
   */
  QuickSelect: {
    /**
     * แนะนำเครื่องตามขนาดกระดาษ (Req 2.1–2.8)
     * @param {object} sheetDim - { width: number, height: number } in cm
     * @returns {string[]} array ของ machine keys
     */
    recommendByPaperSize(sheetDim) {
      if (!sheetDim || typeof sheetDim.width !== 'number' || typeof sheetDim.height !== 'number') {
        return [];
      }
      const minDim = Math.min(sheetDim.width, sheetDim.height);
      const maxDim = Math.max(sheetDim.width, sheetDim.height);
      const result = [];
      for (const [key, spec] of Object.entries(PricingEngine.MACHINE_SPECS)) {
        const fits = (spec.maxWidth >= minDim && spec.maxHeight >= maxDim) ||
                     (spec.maxWidth >= maxDim && spec.maxHeight >= minDim);
        if (fits) result.push(key);
      }
      return result;
    },

    /**
     * แนะนำวิธีพิมพ์ตามจำนวนสั่ง (Req 3.1–3.4)
     * @param {number} quantity
     * @returns {{methods: string[], primary: string, reason: string}}
     */
    recommendByQuantity(quantity) {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q <= 0) {
        return { methods: [], primary: '', reason: '' };
      }
      if (q < 500) {
        return { methods: ['work-and-turn'], primary: 'work-and-turn',
                 reason: 'จำนวนน้อย ใช้ Work-and-Turn ประหยัดเพลทครึ่งหนึ่ง' };
      }
      if (q <= 2000) {
        return { methods: ['work-and-turn'], primary: 'work-and-turn',
                 reason: 'Work-and-Turn ยังประหยัดได้ชัดเจน' };
      }
      if (q <= 5000) {
        return { methods: ['work-and-turn', 'sheetwise'], primary: 'work-and-turn',
                 reason: 'พิจารณาตามคุณภาพที่ต้องการ' };
      }
      return { methods: ['sheetwise'], primary: 'sheetwise',
               reason: 'จำนวนมาก Sheetwise คุณภาพการประกบ (Registration) ดีกว่า' };
    },

    /**
     * แนะนำเครื่องตามจำนวนสี (Req 4.1–4.4)
     * @param {number} colorCount
     * @param {string} [printMethod] - ใช้ 'perfector' เพื่อแนะนำเครื่อง 2 ด้านรอบเดียว
     * @returns {string[]} array ของ machine keys
     */
    recommendByColorCount(colorCount, printMethod) {
      if (printMethod === 'perfector') {
        return ['heidelberg_movp', 'heidelberg_sm74', 'heidelberg_xl106'];
      }
      const c = Number(colorCount);
      if (!Number.isFinite(c) || c <= 0) {
        return [];
      }
      if (c <= 2) {
        return ['heidelberg_gto52', 'heidelberg_mo'];
      }
      if (c === 4) {
        return ['heidelberg_gto52', 'heidelberg_mo', 'heidelberg_sm74', 'heidelberg_xl106'];
      }
      // 3 หรือ 5+ สี
      return ['heidelberg_gto52', 'heidelberg_mo', 'heidelberg_sm74'];
    },

    /**
     * รวม recommendation จากหลายแหล่ง (intersection) (Req 4.5)
     * @param {...string[]} lists
     * @returns {string[]}
     */
    intersectRecommendations(...lists) {
      if (lists.length === 0) return [];
      if (lists.length === 1) return [...lists[0]];
      return lists.reduce((acc, list) => acc.filter(k => list.includes(k)));
    },

    /**
     * เตือนเมื่องาน A4 ใช้กระดาษ 31×43 (Req 2.10)
     * @param {string} sheetSizeKey - '31x43' | '25x36' | '24x35' | etc.
     * @param {object} pieceSize - { width, height } ของชิ้นงาน (ซม.)
     * @returns {string|null} warning message หรือ null
     */
    checkA4Warning(sheetSizeKey, pieceSize) {
      if (sheetSizeKey !== '31x43') return null;
      if (!pieceSize || typeof pieceSize.width !== 'number' || typeof pieceSize.height !== 'number') {
        return null;
      }
      const isA4 = Math.abs(pieceSize.width - 21) <= 1 && Math.abs(pieceSize.height - 29.7) <= 1;
      const isA4Rotated = Math.abs(pieceSize.width - 29.7) <= 1 && Math.abs(pieceSize.height - 21) <= 1;
      if (!isA4 && !isA4Rotated) return null;
      return '⚠️ งาน A4 ไม่ควรใช้กระดาษ 31×43 นิ้ว เพราะตัดแล้วเสียเศษมาก แนะนำ 24×35 หรือ 25×36 นิ้วแทน';
    },
  },

  /**
   * Paper Cutting Optimizer — คำนวณการตัดกระดาษโรงงานเข้าเครื่องพิมพ์
   * Pure functions ไม่มี side effects, ไม่แตะ DOM
   * Req 5–10
   */
  PaperCuttingOptimizer: {
    /**
     * Factory sheets ที่รองรับ (cm, Canonical_Orientation: width >= height)
     * Req 5.1, 5.4
     */
    FACTORY_SHEETS: {
      '31x43': { width: 109.22, height: 78.74, label: '31"×43"' },
      '25x36': { width: 91.44,  height: 63.50, label: '25"×36"' },
      '24x35': { width: 88.90,  height: 60.96, label: '24"×35"' },
      '19x25': { width: 63.50,  height: 48.26, label: '19"×25"' },
    },

    MIN_PIECE_CM: 5,         // Req 6.5
    MAX_ROWS: 8,             // Req 6.1
    MAX_COLS: 8,             // Req 6.1
    MAX_PIECES: 64,          // Req 6.1

    /**
     * Generate cut plans for a factory sheet
     * Req 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2
     * @param {{width:number, height:number}} factory - Canonical orientation (width >= height)
     * @returns {Array<object>} Cut_Result list (without compatibleMachines/machineUnusedCm2 yet)
     */
    _enumerateCutPlans(factory) {
      const seen = new Set();
      const results = [];
      for (let rows = 1; rows <= this.MAX_ROWS; rows++) {
        for (let cols = 1; cols <= this.MAX_COLS; cols++) {
          if (rows * cols > this.MAX_PIECES) continue;

          // Cut produces (factory.width / cols, factory.height / rows) pieces.
          // NOTE: (rows,cols) and (cols,rows) yield DIFFERENT piece geometries
          // (cols divides width, rows divides height), so they are NOT transposes.
          // Both are valid production layouts and must be kept (Req 10.1).
          const w = factory.width / cols;
          const h = factory.height / rows;
          const cutWidth  = Math.max(w, h);
          const cutHeight = Math.min(w, h);

          // Exclude pieces too small (Req 6.5)
          if (cutWidth < this.MIN_PIECE_CM || cutHeight < this.MIN_PIECE_CM) continue;

          const cutsPerSheet = rows * cols;
          const wasteCm2 = factory.width * factory.height - cutsPerSheet * cutWidth * cutHeight;

          // Dedupe by resulting piece geometry + count (Canonical_Orientation,
          // Req 6.2/6.4): two plans that produce the same canonical piece size
          // AND the same number of pieces are true duplicates.
          const key = cutWidth.toFixed(2) + 'x' + cutHeight.toFixed(2) + 'x' + cutsPerSheet;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            rows: rows,
            cols: cols,
            cutsPerSheet: cutsPerSheet,
            cutWidth: cutWidth,
            cutHeight: cutHeight,
            wasteCm2: Math.max(wasteCm2, 0),
            compatibleMachines: [],
            machineUnusedCm2: null,
            recommended: false,
          });
        }
      }
      // Sort by cutsPerSheet ascending so user sees fewer pieces first
      results.sort(function(a, b) { return a.cutsPerSheet - b.cutsPerSheet; });
      return results;
    },

    /**
     * Filter compatible machines for a cut result, sorted by plateSize
     * Req 7.1, 7.2
     * @param {object} cutResult
     * @param {string[]} targetKeys
     * @returns {string[]}
     */
    _filterCompatibleMachines(cutResult, targetKeys) {
      const PLATE_ORDER = { 'ตัด 8': 0, 'ตัด 4': 1, 'ตัด 2': 2, 'ตัด 1': 3 };
      const orderOf = function(key) {
        const m = PricingEngine.MACHINE_SPECS[key];
        if (!m || typeof m.plateSize !== 'string') return 99;
        const match = m.plateSize.match(/ตัด\s*\d+/);
        if (!match) return 99;
        const normalized = match[0].replace(/\s+/, ' ');
        return (PLATE_ORDER[normalized] !== undefined) ? PLATE_ORDER[normalized] : 99;
      };
      return targetKeys
        .filter(function(k) {
          const m = PricingEngine.MACHINE_SPECS[k];
          if (!m) return false;
          const fit = PricingEngine._sheetFitsMachine(
            { width: cutResult.cutWidth, height: cutResult.cutHeight }, m
          );
          return fit.fits;
        })
        .sort(function(a, b) { return orderOf(a) - orderOf(b); });
    },

    /**
     * Compute unused area on the first compatible machine
     * Bleed=0.3, Gripper=1.2, SideLay=0.7 (Req 8.3)
     * @param {object} cutResult
     * @param {string[]} targetKeys (unused — uses cutResult.compatibleMachines instead)
     * @returns {number|null}
     */
    _computeMachineUnused(cutResult, targetKeys) {
      if (!cutResult.compatibleMachines || cutResult.compatibleMachines.length === 0) return null;
      const firstKey = cutResult.compatibleMachines[0];
      const m = PricingEngine.MACHINE_SPECS[firstKey];
      if (!m) return null;
      const usableW = m.maxWidth  - 1.2 - 0.3 * 2;
      const usableH = m.maxHeight - 0.7 * 2;
      const usableArea = usableW * usableH;
      const cutArea = cutResult.cutWidth * cutResult.cutHeight;
      if (usableArea <= cutArea) return 0;
      return Math.round((usableArea - cutArea) * 10) / 10; // 1 decimal (Req 8.4)
    },

    /**
     * Mark exactly one Cut_Result as recommended based on optimization mode
     * Req 9.1, 9.2, 9.3, 9.5
     * @param {Array<object>} results
     * @param {'pieces'|'waste'} optimizeFor
     */
    _markRecommended(results, optimizeFor) {
      // Reset all flags
      for (let i = 0; i < results.length; i++) results[i].recommended = false;

      const eligible = results.filter(function(r) {
        return r.compatibleMachines && r.compatibleMachines.length > 0;
      });
      if (eligible.length === 0) return; // Req 9.5

      const winner = eligible.reduce(function(best, r) {
        if (!best) return r;
        if (optimizeFor === 'waste') {
          if (r.wasteCm2 < best.wasteCm2) return r;
          if (r.wasteCm2 === best.wasteCm2 && r.cutsPerSheet > best.cutsPerSheet) return r;
        } else {
          // 'pieces' (default)
          if (r.cutsPerSheet > best.cutsPerSheet) return r;
          if (r.cutsPerSheet === best.cutsPerSheet && r.wasteCm2 < best.wasteCm2) return r;
        }
        return best;
      }, null);
      if (winner) winner.recommended = true;
    },

    /**
     * Public optimizer entry point
     * Req 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 9.1, 9.5
     * @param {string} factoryKey - one of FACTORY_SHEETS keys
     * @param {string[]} [targetMachineKeys] - empty = use all machines
     * @param {'pieces'|'waste'} [optimizeFor='pieces']
     * @returns {{success:boolean, factory?:object, results?:Array<object>, error?:string}}
     */
    optimize(factoryKey, targetMachineKeys, optimizeFor) {
      const factory = this.FACTORY_SHEETS[factoryKey];
      if (!factory) {
        // Req 5.5
        return { success: false, error: 'ไม่รู้จักขนาดกระดาษ ' + factoryKey };
      }

      const targets = (targetMachineKeys && targetMachineKeys.length > 0)
        ? targetMachineKeys.slice()
        : Object.keys(PricingEngine.MACHINE_SPECS); // Req 5.3

      const mode = (optimizeFor === 'waste') ? 'waste' : 'pieces';

      const results = this._enumerateCutPlans(factory);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        r.compatibleMachines = this._filterCompatibleMachines(r, targets);
        r.machineUnusedCm2 = this._computeMachineUnused(r, targets);
      }
      this._markRecommended(results, mode);
      return { success: true, factory: factory, results: results };
    },
  },

  /**
   * Main entry point — routes to the correct strategy based on system
   * @param {string} system - Printing system identifier
   * @param {string} productType - Product type identifier
   * @param {object} specs - Print specifications
   * @param {object} priceTable - Full price table data
   * @returns {CalculationResult}
   */
  calculate(system, productType, specs, priceTable) {
    try {
      switch (system) {
        case 'screen':
          return this.calculateScreen(productType, specs, priceTable);
        case 'digitalOffset':
          return this.calculateDigitalOffset(productType, specs, priceTable);
        case 'industrialOffset':
          return this.calculateIndustrialOffset(productType, specs, priceTable);
        case 'inkjet':
          return this.calculateInkjet(productType, specs, priceTable);
        case 'paperCalc':
          return this.calculatePaper(productType, specs, priceTable);
        case 'pressSheet':
          return this.calculatePressSheet(productType, specs, priceTable);
        default:
          return this._errorResult(system, productType, specs, 'ไม่พบระบบพิมพ์ที่เลือก');
      }
    } catch (e) {
      return this._errorResult(system, productType, specs, e.message || 'เกิดข้อผิดพลาดในการคำนวณ');
    }
  },

  /**
   * Screen printing calculation strategy
   * Supports: sticker, box, fabricBag, label
   * Formula: total = (plateCost × colorCount) + (printCostPerColor × colorCount × qty) + materialCost
   * @param {string} productType - Product type key
   * @param {object} specs - { size: {width, height, depth?}, material, colorCount, quantity }
   * @param {object} priceTable - Full price table
   * @returns {CalculationResult}
   */
  calculateScreen(productType, specs, priceTable) {
    const screenTable = priceTable && priceTable.screen;
    if (!screenTable || !screenTable[productType]) {
      return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const productTable = screenTable[productType];
    const { size, material, colorCount, quantity } = specs;

    // Validate required fields exist in price table
    if (!productTable.plateCost && productTable.plateCost !== 0) {
      return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }
    if (!productTable.printCostPerColor || !productTable.printCostPerColor.tiers) {
      return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    // 1. Calculate plate cost
    // Sheetwise: ค่าบล็อก × 2 (ต้องทำ 2 ชุด), Work-and-Turn/Tumble: × 1
    const printMethod = specs.printMethod || 'single';
    const plateMultiplier = (printMethod === 'sheetwise') ? 2 : 1;
    const plateCost = this.calculatePlateCost(colorCount, productTable.plateCost) * plateMultiplier;

    // 2. Find print cost per color from quantity tiers
    const printCostPerUnit = this._findTierPrice(productTable.printCostPerColor.tiers, quantity);
    if (printCostPerUnit === null) {
      return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับจำนวนที่เลือก');
    }
    const printSides = specs.printSides || 1;
    // Work-and-Turn / Work-and-Tumble: พิมพ์ 2 ด้านแต่ใช้เพลท 1 ชุด ค่าพิมพ์ 1 รอบ
    // Sheetwise: พิมพ์ 2 ด้าน ใช้เพลท 2 ชุด ค่าพิมพ์ 2 รอบ
    const printMultiplier = (printMethod === 'sheetwise') ? 2 : (printSides === 2 ? 1 : 1);
    const printCost = printCostPerUnit * colorCount * quantity * printMultiplier;

    // 3. Calculate material cost based on product type
    let materialCost = 0;
    let materialLabel = 'ค่าวัสดุ';
    const costBreakdown = [];

    if (productType === 'sticker' || productType === 'label') {
      // materialCost = pricePerSqCm × area × qty
      const area = this.calculateArea(size.width, size.height);
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || !materialData.pricePerSqCm) {
        return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      materialCost = this.calculateMaterialCost(area, quantity, materialData.pricePerSqCm);
      materialLabel = 'ค่าวัสดุ';
    } else if (productType === 'box') {
      // materialCost = pricePerSqCm × surfaceArea × qty
      // surfaceArea = 2*(w*h + w*d + h*d)
      const w = size.width;
      const h = size.height;
      const d = size.depth || 0;
      const surfaceArea = 2 * (w * h + w * d + h * d);
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || !materialData.pricePerSqCm) {
        return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      materialCost = this.calculateMaterialCost(surfaceArea, quantity, materialData.pricePerSqCm);
      materialLabel = 'ค่ากระดาษ';
    } else if (productType === 'fabricBag') {
      // materialCost = pricePerBag (from size tier) × qty
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || !materialData.pricePerBag || !materialData.pricePerBag.tiers) {
        return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      const bagArea = size.width * size.height;
      const pricePerBag = this._findSizeTierPrice(materialData.pricePerBag.tiers, bagArea);
      if (pricePerBag === null) {
        return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับขนาดที่เลือก');
      }
      materialCost = pricePerBag * quantity;
      materialLabel = 'ค่าถุงผ้า';
    }

    // Build cost breakdown
    costBreakdown.push({ label: 'ค่าทำบล็อก', amount: plateCost, conditional: false });
    costBreakdown.push({ label: 'ค่าพิมพ์ต่อสี', amount: printCost, conditional: false });
    costBreakdown.push({ label: materialLabel, amount: materialCost, conditional: false });

    // Add die-cut cost for box if applicable
    if (productType === 'box' && productTable.dieCutCost && productTable.dieCutCost.tiers) {
      const w = size.width;
      const h = size.height;
      const d = size.depth || 0;
      const surfaceArea = 2 * (w * h + w * d + h * d);
      const dieCutCost = this._findAreaTierCost(productTable.dieCutCost.tiers, surfaceArea);
      if (dieCutCost !== null && dieCutCost > 0) {
        costBreakdown.push({ label: 'ค่าไดคัท', amount: dieCutCost, conditional: true });
      }
    }

    // Calculate total
    const totalPrice = costBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const unitPrice = totalPrice / quantity;

    return {
      success: true,
      system: 'screen',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: totalPrice,
      unitPrice: unitPrice,
      quantity: quantity,
      error: null
    };
  },

  /**
   * Digital offset calculation strategy
   * Supports: sticker, label, boxSmall, businessCard
   * Formula: total = perSheetPrice × sheetsUsed + materialCost + finishingCost
   * NO plate cost in this system
   * @param {string} productType - Product type key
   * @param {object} specs - { size: {width, height, depth?}, material, quantity, finishing: [] }
   * @param {object} priceTable - Full price table
   * @returns {CalculationResult}
   */
  calculateDigitalOffset(productType, specs, priceTable) {
    const digitalTable = priceTable && priceTable.digitalOffset;
    if (!digitalTable || !digitalTable[productType]) {
      return this._errorResult('digitalOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const productTable = digitalTable[productType];
    const { size, material, quantity, finishing } = specs;

    // Validate perSheetPrice tiers exist
    if (!productTable.perSheetPrice || !productTable.perSheetPrice.tiers) {
      return this._errorResult('digitalOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    // 1. Calculate per-sheet printing cost
    const perSheetPrice = this._findDigitalOffsetTierPrice(productTable.perSheetPrice.tiers, quantity);
    if (perSheetPrice === null) {
      return this._errorResult('digitalOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับจำนวนที่เลือก');
    }

    // sheetsUsed = quantity (1 piece per sheet for simplicity)
    const sheetsUsed = quantity;
    const printSides = specs.printSides || 1;
    const printMethod = specs.printMethod || 'single';
    // Sheetwise: × 2, Work-and-Turn/Tumble: × 1 (ได้ 2 ด้านในรอบเดียว)
    const printMultiplier = (printMethod === 'sheetwise') ? 2 : 1;
    const printingCost = perSheetPrice * sheetsUsed * printMultiplier;

    // 2. Calculate material cost based on product type
    let materialCost = 0;
    if (productType === 'businessCard') {
      // businessCard uses pricePerCard
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || materialData.pricePerCard === undefined) {
        return this._errorResult('digitalOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      materialCost = materialData.pricePerCard * quantity;
    } else {
      // sticker, label, boxSmall use pricePerSqCm × area × qty
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || !materialData.pricePerSqCm) {
        return this._errorResult('digitalOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      let area;
      if (productType === 'boxSmall' && size.depth) {
        // Box surface area = 2*(w*h + w*d + h*d)
        area = 2 * (size.width * size.height + size.width * size.depth + size.height * size.depth);
      } else {
        area = this.calculateArea(size.width, size.height);
      }
      materialCost = this.calculateMaterialCost(area, quantity, materialData.pricePerSqCm);
    }

    // 3. Calculate finishing cost
    let finishingCost = 0;
    const finishingItems = [];
    const finishingOptions = finishing || [];

    if (finishingOptions.length > 0 && productTable.finishing) {
      for (const optionKey of finishingOptions) {
        const finishData = productTable.finishing[optionKey];
        if (!finishData) continue; // skip unknown finishing options

        let optionCost = 0;
        if (productType === 'businessCard') {
          // businessCard finishing uses pricePerCard
          if (finishData.pricePerCard !== undefined) {
            optionCost = finishData.pricePerCard * quantity;
          }
        } else {
          // Other products: pricePerSqCm × area × qty OR pricePerPiece × qty
          if (finishData.pricePerSqCm !== undefined) {
            let area;
            if (productType === 'boxSmall' && size.depth) {
              area = 2 * (size.width * size.height + size.width * size.depth + size.height * size.depth);
            } else {
              area = this.calculateArea(size.width, size.height);
            }
            optionCost = finishData.pricePerSqCm * area * quantity;
          } else if (finishData.pricePerPiece !== undefined) {
            optionCost = finishData.pricePerPiece * quantity;
          }
        }

        if (optionCost > 0) {
          finishingCost += optionCost;
          finishingItems.push({ label: finishData.name || optionKey, amount: optionCost, conditional: true });
        }
      }
    }

    // 4. Build cost breakdown (NO plate cost)
    const costBreakdown = [];
    costBreakdown.push({ label: 'ค่าพิมพ์ต่อแผ่น', amount: printingCost, conditional: false });
    costBreakdown.push({ label: 'ค่าวัสดุ', amount: materialCost, conditional: false });

    // Add finishing items as separate line items
    for (const item of finishingItems) {
      costBreakdown.push(item);
    }

    // 5. Calculate total
    const totalPrice = printingCost + materialCost + finishingCost;
    const unitPrice = totalPrice / quantity;

    return {
      success: true,
      system: 'digitalOffset',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: totalPrice,
      unitPrice: unitPrice,
      quantity: quantity,
      error: null
    };
  },

  /**
   * Industrial offset calculation strategy
   * Supports: sticker, label, box, brochure, leaflet, book, catalog
   * Formula: total = (plateCostPerColor × colorCount) + printCost + paperCost + finishingCost
   * Each finishing option appears as a separate line item in costBreakdown
   * @param {string} productType - Product type key
   * @param {object} specs - { size: {width, height, depth?}, material, colorCount, quantity, finishing, pageCount?, bindingType? }
   * @param {object} priceTable - Full price table
   * @returns {CalculationResult}
   */
  calculateIndustrialOffset(productType, specs, priceTable) {
    const offsetTable = priceTable && priceTable.industrialOffset;
    if (!offsetTable || !offsetTable[productType]) {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const productTable = offsetTable[productType];
    const { size, material, colorCount, quantity, finishing, pageCount, bindingType } = specs;

    // Validate required price table fields
    if (!productTable.plateCostPerColor && productTable.plateCostPerColor !== 0) {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }
    if (!productTable.printCost || !productTable.printCost.tiers) {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    // 1. Calculate plate cost (always present for industrial offset)
    // Sheetwise: ค่าเพลท × 2 ชุด, Work-and-Turn/Tumble: × 1 ชุด
    const printMethod = specs.printMethod || 'single';
    const plateMultiplier = (printMethod === 'sheetwise') ? 2 : 1;
    const plateCost = this.calculatePlateCost(colorCount, productTable.plateCostPerColor) * plateMultiplier;

    // 2. Calculate print cost
    // ค่าจ้างพิมพ์ Offset = ราคาเหมาต่อสี × จำนวนสี
    // ถ้าจำนวนเกิน flatRateMaxQty: (เหมา + ส่วนเกิน × overageRate) × จำนวนสี
    let printCost = 0;
    const printData = productTable.printCost;

    if (!printData) {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const printSides = specs.printSides || 1;
    const printMethodOffset = specs.printMethod || 'single';
    // Sheetwise: ค่าพิมพ์ × 2 รอบ, Work-and-Turn/Tumble: × 1 รอบ
    const printMultiplierOffset = (printMethodOffset === 'sheetwise') ? 2 : 1;

    if (printData.flatRate !== undefined) {
      // New format: flatRate + overage
      const flatRate = printData.flatRate;
      const flatRateMaxQty = printData.flatRateMaxQty || 10000;
      const overageRate = printData.overageRate || 0;

      if (quantity <= flatRateMaxQty) {
        // ไม่เกิน flatRateMaxQty: คิดเหมา
        printCost = flatRate * colorCount * printMultiplierOffset;
      } else {
        // เกิน: เหมา + (ส่วนเกิน × overageRate) ต่อสี
        const overageQty = quantity - flatRateMaxQty;
        printCost = (flatRate + overageRate * overageQty) * colorCount * printMultiplierOffset;
      }
    } else if (printData.tiers) {
      // Legacy format: per-unit tiers
      const printCostPerUnit = this._findTierPrice(printData.tiers, quantity);
      if (printCostPerUnit === null) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับจำนวนที่เลือก');
      }
      printCost = printCostPerUnit * quantity * colorCount * printMultiplierOffset;
    } else {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    // 3. Calculate paper/material cost based on product type
    let paperCost = 0;
    let paperLabel = 'ค่าวัสดุ';

    if (productType === 'sticker' || productType === 'label') {
      // paperCost = pricePerSqCm × area × qty
      const area = this.calculateArea(size.width, size.height);
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      // แผ่นพลาสติกไม่มีกาว: คิดราคาตามน้ำหนัก (ค่าถ่วง × ความหนา × ราคา/กก.)
      const effPricePerSqCm = this._materialPricePerSqCm(materialData);
      if (effPricePerSqCm === null) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      paperCost = effPricePerSqCm * area * quantity;
      paperLabel = 'ค่าวัสดุ';
    } else if (productType === 'box') {
      // paperCost = pricePerSqCm × surfaceArea × qty
      const w = size.width;
      const h = size.height;
      const d = size.depth || 0;
      const surfaceArea = 2 * (w * h + w * d + h * d);
      const materialData = productTable.materials && productTable.materials[material];
      if (!materialData || !materialData.pricePerSqCm) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      paperCost = materialData.pricePerSqCm * surfaceArea * quantity;
      paperLabel = 'ค่ากระดาษ';
    } else if (productType === 'brochure' || productType === 'leaflet') {
      // paperCost = pricePerSheet × qty
      const paperData = productTable.paperTypes && productTable.paperTypes[material];
      if (!paperData || !paperData.pricePerSheet) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคากระดาษที่เลือก');
      }
      paperCost = paperData.pricePerSheet * quantity;
      paperLabel = 'ค่ากระดาษ';
    } else if (productType === 'book' || productType === 'catalog') {
      // paperCost = pricePerSheet × pageCount × qty + bindingCost
      const paperData = productTable.paperTypes && productTable.paperTypes[material];
      if (!paperData || !paperData.pricePerSheet) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคากระดาษที่เลือก');
      }
      if (!pageCount || pageCount <= 0) {
        return this._errorResult('industrialOffset', productType, specs, 'กรุณาระบุจำนวนหน้า');
      }
      const bindingData = productTable.bindingTypes && productTable.bindingTypes[bindingType];
      if (!bindingData || !bindingData.costPerPage) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาประเภทเข้าเล่มที่เลือก');
      }
      const sheetCost = paperData.pricePerSheet * pageCount * quantity;
      const bindingCost = bindingData.costPerPage * pageCount * quantity;
      paperCost = sheetCost + bindingCost;
      paperLabel = 'ค่ากระดาษ';
    }

    // 4. Calculate finishing costs — each as separate line item
    const finishingOptions = finishing || [];
    const finishingRates = productTable.finishing || {};
    const finishingItems = this.calculateFinishingCost(finishingOptions, size, quantity, finishingRates, productType, pageCount);

    // Build cost breakdown
    const costBreakdown = [];
    costBreakdown.push({ label: 'ค่าเพลท', amount: plateCost, conditional: false });
    costBreakdown.push({ label: 'ค่าพิมพ์', amount: printCost, conditional: false });
    costBreakdown.push({ label: paperLabel, amount: paperCost, conditional: false });

    // Add each finishing item as a separate line item
    let totalFinishingCost = 0;
    for (const item of finishingItems) {
      costBreakdown.push({ label: item.label, amount: item.amount, conditional: true });
      totalFinishingCost += item.amount;
    }

    // Calculate total
    const totalPrice = plateCost + printCost + paperCost + totalFinishingCost;
    const unitPrice = totalPrice / quantity;

    return {
      success: true,
      system: 'industrialOffset',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: totalPrice,
      unitPrice: unitPrice,
      quantity: quantity,
      error: null
    };
  },

  /**
   * Inkjet calculation strategy
   * Supports: vinylSign, largeSticker, banner, poster
   * Area-based pricing: area = (width × height) / 10000 (sq meters)
   * Formula: total = printCost + mediaCost + finishingCosts (all area-based)
   * @param {string} productType - Product type key
   * @param {object} specs - { size: {width, height}, resolution, media, quantity, finishing }
   * @param {object} priceTable - Full price table
   * @returns {CalculationResult}
   */
  calculateInkjet(productType, specs, priceTable) {
    const inkjetTable = priceTable && priceTable.inkjet;
    if (!inkjetTable || !inkjetTable[productType]) {
      return this._errorResult('inkjet', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const productTable = inkjetTable[productType];
    const { size, resolution, media, quantity, finishing } = specs;

    // Validate resolution pricing exists
    if (!productTable.pricePerSqM || !productTable.pricePerSqM[resolution]) {
      return this._errorResult('inkjet', productType, specs, 'ไม่พบข้อมูลราคาสำหรับความละเอียดที่เลือก');
    }

    // Validate media exists
    if (!productTable.media || !productTable.media[media]) {
      return this._errorResult('inkjet', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
    }

    // Calculate area in square meters
    const areaSqM = (size.width * size.height) / 10000;

    // 1. Print cost = pricePerSqM[resolution] × area × qty × printMultiplier
    const printPricePerSqM = productTable.pricePerSqM[resolution];
    const printSides = specs.printSides || 1;
    const printMethod = specs.printMethod || 'single';
    const printMultiplier = (printMethod === 'sheetwise') ? 2 : 1;
    const printCost = printPricePerSqM * areaSqM * quantity * printMultiplier;

    // 2. Media cost = media.pricePerSqM × area × qty
    const mediaPricePerSqM = productTable.media[media].pricePerSqM;
    const mediaCost = mediaPricePerSqM * areaSqM * quantity;

    // Build cost breakdown
    const costBreakdown = [];
    costBreakdown.push({ label: 'ค่าพิมพ์', amount: printCost, conditional: false });
    costBreakdown.push({ label: 'ค่าวัสดุ', amount: mediaCost, conditional: false });

    // 3. Finishing costs
    const finishingOptions = finishing || [];
    if (finishingOptions.length > 0 && productTable.finishing) {
      // Calculate perimeter in meters for perimeter-based finishing
      const perimeterM = 2 * (size.width + size.height) / 100;

      for (const finishKey of finishingOptions) {
        const finishData = productTable.finishing[finishKey];
        if (!finishData) continue; // skip unknown finishing options

        let finishCost = 0;
        let finishLabel = finishData.name || finishKey;

        if (finishData.pricePerSqM !== undefined) {
          // Area-based finishing (uvCoating, laminate, woodFrame, dieCut)
          finishCost = finishData.pricePerSqM * areaSqM * quantity;
        } else if (finishData.pricePerMeter !== undefined) {
          // Perimeter-based finishing (eyelet, hemming)
          finishCost = finishData.pricePerMeter * perimeterM * quantity;
        }

        if (finishCost > 0) {
          costBreakdown.push({ label: 'ค่าตกแต่ง: ' + finishLabel, amount: finishCost, conditional: true });
        }
      }
    }

    // Calculate total
    const totalPrice = costBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const unitPrice = totalPrice / quantity;

    return {
      success: true,
      system: 'inkjet',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: totalPrice,
      unitPrice: unitPrice,
      quantity: quantity,
      error: null
    };
  },

  /**
   * Paper price calculation
   * คำนวณราคากระดาษจากแกรม ขนาด จำนวน พร้อม markup 20%
   * @param {string} productType - Paper type key (woodfree, artPaper, artBoard, etc.)
   * @param {object} specs - { gsm, sheetSize, quantity, quantityUnit, brand? }
   * @param {object} priceTable - Full price table
   * @returns {CalculationResult}
   */
  calculatePaper(productType, specs, priceTable) {
    const { gsm, sheetSize, quantity, quantityUnit } = specs;

    // Paper price data (ราคาต่อกก.)
    const paperPrices = this.getPaperPricePerKg(productType, gsm, specs.brand);
    if (!paperPrices) {
      return this._errorResult('paperCalc', productType, specs, 'ไม่พบข้อมูลราคากระดาษสำหรับประเภทและแกรมที่เลือก');
    }

    // Sheet sizes in cm
    const sheetSizes = {
      '31x43': { width: 78.74, height: 109.22, name: '31×43 นิ้ว' },
      '25x36': { width: 63.50, height: 91.44, name: '25×36 นิ้ว' },
      '24x35': { width: 60.96, height: 88.90, name: '24×35 นิ้ว' },
    };

    const sheet = sheetSizes[sheetSize];
    if (!sheet) {
      return this._errorResult('paperCalc', productType, specs, 'ไม่พบขนาดกระดาษที่เลือก');
    }

    // Calculate weight per sheet (grams)
    const weightPerSheet = (sheet.width * sheet.height * gsm) / 10000;

    // Calculate total based on quantity unit
    let totalSheets = 0;
    let totalWeightKg = 0;

    if (quantityUnit === 'ream') {
      totalSheets = quantity * 500;
      totalWeightKg = weightPerSheet * totalSheets / 1000;
    } else if (quantityUnit === 'sheet') {
      totalSheets = quantity;
      totalWeightKg = weightPerSheet * totalSheets / 1000;
    } else if (quantityUnit === 'kg') {
      totalWeightKg = quantity;
      totalSheets = Math.floor((quantity * 1000) / weightPerSheet);
    }

    // Calculate costs
    const pricePerKg = paperPrices.pricePerKg;
    const costPrice = totalWeightKg * pricePerKg;
    const markup = 1.20; // 20% markup
    const sellingPrice = costPrice * markup;
    const pricePerSheetCost = (weightPerSheet / 1000) * pricePerKg;
    const pricePerSheetSell = pricePerSheetCost * markup;

    // Build cost breakdown
    const costBreakdown = [
      { label: 'ประเภทกระดาษ', amount: 0, conditional: false, text: paperPrices.name },
      { label: 'น้ำหนักต่อแผ่น', amount: weightPerSheet, conditional: false, unit: 'กรัม' },
      { label: 'จำนวนแผ่น', amount: totalSheets, conditional: false, unit: 'แผ่น' },
      { label: 'น้ำหนักรวม', amount: totalWeightKg, conditional: false, unit: 'กก.' },
      { label: 'ราคาต้นทุน (' + pricePerKg + ' บาท/กก.)', amount: costPrice, conditional: false },
      { label: 'ราคาขาย (+20%)', amount: sellingPrice, conditional: false },
      { label: 'ราคาต้นทุน/แผ่น', amount: pricePerSheetCost, conditional: false },
      { label: 'ราคาขาย/แผ่น', amount: pricePerSheetSell, conditional: false },
    ];

    return {
      success: true,
      system: 'paperCalc',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: sellingPrice,
      unitPrice: pricePerSheetSell,
      quantity: totalSheets,
      error: null
    };
  },

  /**
   * Get paper price per kg based on type, gsm, and brand
   * @param {string} paperType - Paper type key
   * @param {number} gsm - Paper weight in GSM
   * @param {string} [brand] - Optional brand
   * @returns {object|null} { name, pricePerKg }
   */
  getPaperPricePerKg(paperType, gsm, brand) {
    const prices = {
      woodfree: [
        { gsm: [60], brand: 'Sky Blue / Paper Plus', pricePerKg: 31.00 },
        { gsm: [70, 80, 100, 120], brand: 'Sky Blue / Paper Plus', pricePerKg: 30.00 },
        { gsm: [60], brand: 'UPM PEFC', pricePerKg: 32.00 },
        { gsm: [70, 80], brand: 'UPM PEFC', pricePerKg: 31.00 },
        { gsm: [60], brand: 'Premium X', pricePerKg: 30.00 },
        { gsm: [70, 80, 100], brand: 'Premium X', pricePerKg: 29.00 },
      ],
      artPaper: [
        { gsm: [80, 85, 90], brand: 'Superkote', pricePerKg: 34.00 },
        { gsm: [100, 105, 113, 120, 128, 157], brand: 'Superkote', pricePerKg: 32.00 },
        { gsm: [80], brand: 'Nevia Spakling', pricePerKg: 33.00 },
        { gsm: [85, 90], brand: 'Nevia Spakling', pricePerKg: 32.00 },
        { gsm: [100, 105, 113, 120, 128, 157], brand: 'Nevia Spakling', pricePerKg: 31.00 },
        { gsm: [80, 85, 90], brand: 'YUKI/HI-KOTE/ART-TECH', pricePerKg: 32.00 },
        { gsm: [100, 105, 115, 120, 128], brand: 'YUKI/HI-KOTE/ART-TECH', pricePerKg: 31.00 },
      ],
      artBoard: [
        { gsm: [190, 210], brand: 'A-CARD', pricePerKg: 40.00 },
        { gsm: [230, 260, 310, 360, 420], brand: 'A-CARD', pricePerKg: 39.00 },
        { gsm: [190, 210, 230, 260, 310, 360, 400], brand: 'GB-U', pricePerKg: 34.00 },
        { gsm: [190, 210, 230, 260, 300, 350], brand: 'Hi-Kote', pricePerKg: 30.00 },
      ],
      ivoryBoard: [
        { gsm: [190, 210], brand: 'Sino Board', pricePerKg: 33.00 },
        { gsm: [230, 250, 270, 300, 350], brand: 'Sino Board', pricePerKg: 32.00 },
        { gsm: [280, 330, 380], brand: 'Sino Bulky', pricePerKg: 36.00 },
        { gsm: [215, 235, 250, 295], brand: 'Allyking Cream', pricePerKg: 29.00 },
      ],
      greyBack: [
        { gsm: [250], brand: 'Happy/KLEANNARA', pricePerKg: 23.50 },
        { gsm: [270], brand: 'Happy/KLEANNARA', pricePerKg: 23.00 },
        { gsm: [300, 350, 400, 450], brand: 'Happy/KLEANNARA', pricePerKg: 22.50 },
      ],
      kraft: [
        { gsm: [50], brand: 'JN', pricePerKg: 31.00 },
        { gsm: [60, 75], brand: 'JN', pricePerKg: 30.00 },
        { gsm: [117], brand: 'ARIA / RED CROWN', pricePerKg: 40.00 },
        { gsm: [140, 170], brand: 'PRO PACK', pricePerKg: 28.00 },
      ],
      cardWhite: [
        { gsm: [150, 180, 210, 230, 250], brand: 'IK', pricePerKg: 34.50 },
      ],
    };

    const paperList = prices[paperType];
    if (!paperList) return null;

    // Find matching price entry
    for (const entry of paperList) {
      if (entry.gsm.includes(gsm)) {
        if (brand && entry.brand !== brand) continue;
        return { name: paperType + ' ' + gsm + ' แกรม (' + entry.brand + ')', pricePerKg: entry.pricePerKg };
      }
    }

    // If no exact match, find closest
    for (const entry of paperList) {
      if (entry.gsm.includes(gsm)) {
        return { name: paperType + ' ' + gsm + ' แกรม (' + entry.brand + ')', pricePerKg: entry.pricePerKg };
      }
    }

    return null;
  },

  // ─── Helper Functions ───────────────────────────────────────────────

  /**
   * Pure function ตรวจว่า sheet ใส่ machine ได้ไหม (ลอง 2 orientation)
   * @param {{width:number, height:number}} sheet - cm
   * @param {object} machine - MachineSpec มี maxWidth, maxHeight, minWidth, minHeight
   * @returns {{fits:boolean, reason:'tooSmall'|'tooLarge'|null, orientation:'normal'|'rotated'|null}}
   */
  _sheetFitsMachine(sheet, machine) {
    const w = Number(sheet.width);
    const h = Number(sheet.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !machine) {
      return { fits: false, reason: 'tooSmall', orientation: null };
    }
    const fitsNormal = (
      w <= machine.maxWidth  && w >= machine.minWidth  &&
      h <= machine.maxHeight && h >= machine.minHeight
    );
    const fitsRotated = (
      h <= machine.maxWidth  && h >= machine.minWidth  &&
      w <= machine.maxHeight && w >= machine.minHeight
    );
    if (fitsNormal)  return { fits: true,  reason: null, orientation: 'normal'  };
    if (fitsRotated) return { fits: true,  reason: null, orientation: 'rotated' };

    // Determine why it failed
    const tooLargeNormal  = w > machine.maxWidth  || h > machine.maxHeight;
    const tooLargeRotated = h > machine.maxWidth  || w > machine.maxHeight;
    if (tooLargeNormal && tooLargeRotated) return { fits: false, reason: 'tooLarge',  orientation: null };
    return { fits: false, reason: 'tooSmall', orientation: null };
  },

  /**
   * หา Cut_Sheet ที่ดีที่สุดสำหรับตัด Factory_Sheet ให้เข้าเครื่องพิมพ์ที่เลือก
   * เรียก PaperCuttingOptimizer.optimize() กรองเฉพาะแผนที่ compatibleMachines มี pressType
   * แล้วเลือกแผนที่ waste น้อยสุด (tie-break: cutsPerSheet มากกว่า)
   * Req 1.1, 1.2, 1.7
   * @param {string} factoryKey - หนึ่งใน FACTORY_SHEETS keys
   * @param {string} pressType - MACHINE_SPECS key ของเครื่องที่เลือก
   * @param {'waste'|'pieces'} [optimizeFor='waste']
   * @returns {{cutWidth:number, cutHeight:number, cutsPerParentSheet:number, factory:object, wasteCm2:number}|null}
   *          null เมื่อ optimize ไม่สำเร็จหรือไม่มีแผน compatible (Req 1.7)
   */
  _resolveCutSheet(factoryKey, pressType, optimizeFor = 'waste') {
    const res = this.PaperCuttingOptimizer.optimize(factoryKey, [pressType], optimizeFor);
    if (!res || !res.success || !Array.isArray(res.results)) return null;
    const compatible = res.results.filter(r => r.compatibleMachines && r.compatibleMachines.includes(pressType));
    if (compatible.length === 0) return null;   // Req 1.7 — no cut fits → caller returns Thai error
    // เลือก "ใบหลังตัดที่ใหญ่ที่สุด" ที่ยังเข้าเครื่องได้ = จำนวนตัดต่อใบน้อยสุด
    // (ใช้กระดาษเต็มประสิทธิภาพเครื่อง + ถ้าเต็มแผ่นเข้าเครื่องได้จะได้ 1 ตัด = พฤติกรรมเดิม)
    // tie-break: waste น้อยกว่า
    const winner = compatible.reduce((best, r) => {
      if (!best) return r;
      if (r.cutsPerSheet < best.cutsPerSheet) return r;
      if (r.cutsPerSheet === best.cutsPerSheet && r.wasteCm2 < best.wasteCm2) return r;
      return best;
    }, null);
    return {
      cutWidth: winner.cutWidth,
      cutHeight: winner.cutHeight,
      cutsPerParentSheet: winner.cutsPerSheet,
      factory: res.factory,        // { width, height, label }
      wasteCm2: winner.wasteCm2,
    };
  },

  /**
   * Normalize จำนวนสีต่อด้านและจำนวนเพลทรวมจาก specs
   * รองรับ legacy colorCount (→ frontColors, sides=1) และ field ใหม่ sides/frontColors/backColors
   * - frontColors = specs.frontColors ?? specs.colorCount ?? 1 (clamp ≥ 1 เมื่อ NaN/<1)
   * - sides = specs.sides ?? (method==='single' ? 1 : 2)
   * - backColors = (sides===2) ? specs.backColors ?? 0 : 0 (clamp ≥ 0 เมื่อ NaN/<0)
   * - totalPlates = sides===1 ? frontColors : frontColors + backColors
   * Req 3.1, 3.2, 3.3, 3.4, 3.5, 3.8
   * @param {object} specs - { printMethod?, sides?, frontColors?, backColors?, colorCount? }
   * @returns {{sides:1|2, frontColors:number, backColors:number, totalPlates:number, method:string}}
   */
  _resolvePerSideColors(specs) {
    const method = specs.printMethod || 'single';
    // frontColors: prefer frontColors, fallback colorCount, default 1 — clamp ≥ 1 (NaN/<1 → 1)
    const rawFront = (specs.frontColors != null && specs.frontColors !== '')
      ? specs.frontColors
      : (specs.colorCount != null && specs.colorCount !== '' ? specs.colorCount : 1);
    const frontNum = Number(rawFront);
    const frontColors = (Number.isFinite(frontNum) && frontNum >= 1) ? frontNum : 1;
    // sides: explicit specs.sides, else infer from printMethod (single → 1, others → 2)
    let sides = (specs.sides != null && specs.sides !== '') ? Number(specs.sides)
                : (method === 'single' ? 1 : 2);
    if (sides !== 2) sides = 1;
    // backColors: only when sides===2 — clamp ≥ 0 (NaN/<0 → 0)
    let backColors = 0;
    if (sides === 2) {
      const backNum = Number(specs.backColors != null && specs.backColors !== '' ? specs.backColors : 0);
      backColors = (Number.isFinite(backNum) && backNum >= 0) ? backNum : 0;
    }
    // totalPlates: sides=1 → frontColors; sides=2 (any method) → frontColors + backColors
    const totalPlates = (sides === 1) ? frontColors : (frontColors + backColors);
    return { sides, frontColors, backColors, totalPlates, method };
  },

  /**
   * Press Sheet calculation — คำนวณใบพิมพ์
   * คำนวณจำนวนชิ้นต่อใบพิมพ์, ใบพิมพ์ขั้นต่ำ, spoilage, ใบพิมพ์รวม, ต้นทุนกระดาษ, ค่าเพลท, ราคารวม
   * @param {string} productType - Ignored (single product type)
   * @param {object} specs - { size: {width, height}, sheetSize, quantity, colorCount, jobType, printMethod, paperType, gsm, pressType }
   * @param {object} priceTable - Full price table (unused for this calculation)
   * @returns {CalculationResult}
   */
  calculatePressSheet(productType, specs, priceTable) {
    const { size, sheetSize, quantity, colorCount, jobType, printMethod, paperType, gsm, pressType } = specs;

    if (!size || !size.width || !size.height) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาระบุขนาดชิ้นงาน');
    }
    if (!sheetSize) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาเลือกขนาดกระดาษ');
    }
    if (!quantity || quantity <= 0) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาระบุจำนวนพิมพ์');
    }
    if (!paperType) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาเลือกชนิดกระดาษ');
    }
    const isSticker = this._isStickerMaterial(paperType);
    if (!isSticker && !gsm) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาเลือกแกรมกระดาษ');
    }
    if (!pressType) {
      return this._errorResult('pressSheet', productType, specs, 'กรุณาเลือกเครื่องพิมพ์');
    }

    // Sheet sizes in cm
    const sheetSizes = {
      '31x43': { width: 78.74, height: 109.22, name: '31×43 นิ้ว' },
      '25x36': { width: 63.50, height: 91.44, name: '25×36 นิ้ว' },
      '24x35': { width: 60.96, height: 88.90, name: '24×35 นิ้ว' },
      '19x25': { width: 63.50, height: 48.26, name: '19×25 นิ้ว' },
    };

    const sheet = sheetSizes[sheetSize];
    if (!sheet) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบขนาดกระดาษที่เลือก');
    }

    // Press machine specs (ขนาดรับกระดาษ + ค่าเพลทต่อสี)
    const press = PricingEngine.MACHINE_SPECS[pressType];
    if (!press) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบเครื่องพิมพ์ที่เลือก');
    }

    // ── ตัดกระดาษโรงงานให้พอดีเครื่องอัตโนมัติ (Req 1, 2) ──
    // sheetSize = Factory_Sheet key; หา Cut_Sheet (ใบหลังตัด) ที่ใหญ่สุดที่เข้าเครื่องได้
    const cut = this._resolveCutSheet(sheetSize, pressType, 'waste');
    if (!cut) {
      // Req 1.7 — ไม่มีแผนตัดที่เข้าเครื่อง
      return this._errorResult('pressSheet', productType, specs,
        'กระดาษ ' + sheet.name + ' ตัดเข้าเครื่อง ' + press.name +
        ' ไม่ได้ — ลองเลือกขนาดกระดาษหรือเครื่องพิมพ์อื่น');
    }
    // ใบหลังตัดที่เข้าเครื่อง (เป็นพื้นผิว imposition)
    const cutWidth = cut.cutWidth;
    const cutHeight = cut.cutHeight;
    const cutsPerParentSheet = cut.cutsPerParentSheet;
    // Factory_Sheet ที่ซื้อจริง (ใช้คิดน้ำหนัก/ต้นทุนกระดาษ)
    const factoryWidth = cut.factory.width;
    const factoryHeight = cut.factory.height;

    // ── ราคา/ข้อมูลวัสดุ ──
    // Paper_Material → คิดตามน้ำหนัก/กก. ; Sticker_Material → คิดตามพื้นที่
    let paperInfo = null;
    if (!isSticker) {
      paperInfo = this.getPaperPricePerKg(paperType, Number(gsm));
      if (!paperInfo) {
        return this._errorResult('pressSheet', productType, specs, 'ไม่พบราคากระดาษสำหรับ ' + paperType + ' ' + gsm + ' แกรม');
      }
    } else if (this.STICKER_PRICE_PER_SQCM[paperType] === undefined) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบราคาสติกเกอร์สำหรับ ' + paperType);
    }

    // Default gripper/side lay (Req 5.1–5.3)
    let gripperMargin = 1.2; // cm (12 mm)
    let sideLay = 0.7;       // cm (7 mm)

    // Override (Req 5.4–5.6)
    if (specs.gripperOverride !== undefined && specs.gripperOverride !== null && specs.gripperOverride !== '') {
      const g = Number(specs.gripperOverride);
      if (!Number.isFinite(g) || g < 1.0 || g > 1.5) {
        return this._errorResult('pressSheet', productType, specs,
          'Gripper Margin ต้องอยู่ระหว่าง 10–15 มม. (1.0–1.5 ซม.)');
      }
      gripperMargin = g;
    }
    if (specs.sideLayOverride !== undefined && specs.sideLayOverride !== null && specs.sideLayOverride !== '') {
      const s = Number(specs.sideLayOverride);
      if (!Number.isFinite(s) || s < 0.5 || s > 1.0) {
        return this._errorResult('pressSheet', productType, specs,
          'Side Lay ต้องอยู่ระหว่าง 5–10 มม. (0.5–1.0 ซม.)');
      }
      sideLay = s;
    }

    const printableWidth = cutWidth - gripperMargin;
    const printableHeight = cutHeight - sideLay;

    // Bleed allowance: 0.6 cm per axis (3mm per side × 2 sides)
    const bleed = 0.6;
    const pieceWidth = size.width + bleed;
    const pieceHeight = size.height + bleed;

    // Calculate pieces per sheet (try both orientations) — บน Cut_Sheet (Req 1.3, 1.6)
    const piecesNormal = Math.floor(printableWidth / pieceWidth) * Math.floor(printableHeight / pieceHeight);
    const piecesRotated = Math.floor(printableWidth / pieceHeight) * Math.floor(printableHeight / pieceWidth);
    const nUp = Math.max(piecesNormal, piecesRotated);

    if (nUp <= 0) {
      return this._errorResult('pressSheet', productType, specs, 'ชิ้นงานใหญ่เกินกว่าจะวางบนใบหลังตัดได้');
    }

    // Spoilage profile (Req 12) — resolve via legacy map for backwards compat (Req 12.11)
    const resolvedJobType = this.LEGACY_JOB_TYPE_MAP[jobType] || jobType;
    const profile = this.SPOILAGE_PROFILES[resolvedJobType] || this.SPOILAGE_PROFILES.twoColorGeneral;

    // Perfecting modifier (Req 13.1)
    let perfectingExtra = 0;
    let perfectingApplied = false;
    if (specs.printMethod === 'perfector') {
      perfectingExtra = this.PERFECTING_MODIFIER_DEFAULT;
      perfectingApplied = true;
      // Override (Req 13.4)
      if (specs.perfectingModifierOverride !== undefined &&
          specs.perfectingModifierOverride !== null &&
          specs.perfectingModifierOverride !== '') {
        const m = Number(specs.perfectingModifierOverride);
        if (!Number.isFinite(m) || m < this.PERFECTING_MODIFIER_MIN || m > this.PERFECTING_MODIFIER_MAX) {
          // Req 13.5
          return this._errorResult('pressSheet', productType, specs,
            'Perfecting Modifier ต้องอยู่ระหว่าง ' +
            (this.PERFECTING_MODIFIER_MIN * 100).toFixed(0) + '–' +
            (this.PERFECTING_MODIFIER_MAX * 100).toFixed(0) + '% (เช่น 0.025 = 2.5%)');
        }
        perfectingExtra = m;
      }
    }
    const effectiveRate = profile.rate + perfectingExtra;

    // ── จำนวนหน้า + สีต่อด้าน (Req 3) ──
    const perSide = this._resolvePerSideColors(specs);
    const method = perSide.method;
    const frontColors = perSide.frontColors;
    const backColors = perSide.backColors;
    const totalPlates = perSide.totalPlates;

    // ชิ้นสำเร็จต่อใบพิมพ์: W&T / W&Tumble ได้ครึ่งหนึ่ง (หน้า-หลังบนใบเดียว) (Req 3.5)
    const isWorkAndTurn = (method === 'work-and-turn' || method === 'work-and-tumble');
    const finishedPiecesPerSheet = isWorkAndTurn ? Math.floor(nUp / 2) : nUp;
    if (finishedPiecesPerSheet <= 0) {
      return this._errorResult('pressSheet', productType, specs, 'ชิ้นงานใหญ่เกินกว่าจะวางบนใบหลังตัดได้ (งานหน้าในตัวต้องการอย่างน้อย 2 ชิ้น/ใบ)');
    }

    // จำนวนใบพิมพ์ (Cut_Sheet) ขั้นต่ำ ก่อน spoilage
    const minSheets = Math.ceil(quantity / finishedPiecesPerSheet);

    // Spoilage with profile.minSheets minimum (Req 12.8)
    const spoilageRaw = Math.ceil(minSheets * effectiveRate);
    const spoilageSheets = Math.max(spoilageRaw, profile.minSheets);
    const printSheetsNeeded = minSheets + spoilageSheets;   // จำนวน Cut_Sheet ที่ต้องพิมพ์
    const spoilageHitMin = (spoilageRaw < profile.minSheets);

    // จำนวน Factory_Sheet ที่ต้องซื้อ (Req 1.4)
    const parentSheetCount = Math.ceil(printSheetsNeeded / cutsPerParentSheet);

    // Plate cost — lookup จาก active table (Req 14.2, 14.3) × Total_Plates (Req 3.3–3.5)
    const activePlateTable = this.getActivePlateCostTable();
    const platePerColor = (activePlateTable.table[pressType] !== undefined)
      ? activePlateTable.table[pressType]
      : press.plateCostPerColor;  // fallback
    const plateCost = platePerColor * totalPlates;

    // Ink type — สติกเกอร์ default UV, กระดาษ default conventional, ผู้ใช้ override ได้ (Req 4.2, 4.5, 4.6)
    let inkType;
    if (specs.inkType === 'uv' || specs.inkType === 'conventional') {
      inkType = specs.inkType;
    } else {
      inkType = isSticker ? (this.MATERIAL_INK_DEFAULT[paperType] || 'uv') : 'conventional';
    }

    // Print Cost (Req 3.6) — คิดต่อด้านผ่านตาราง Heidelberg แล้วรวม (ส่ง 'single' กันนับ multiplier ซ้ำ)
    const pc = (c) => this.calculatePrintCost(press.plateSize, inkType, printSheetsNeeded, c, 'single');
    let printCostResult;
    let printCost;
    if (perSide.sides === 1) {
      printCostResult = pc(frontColors);
      printCost = printCostResult.cost;
    } else if (isWorkAndTurn) {
      // หน้าในตัว: พิมพ์รอบเดียว สีรวมหน้า+หลังบนเพลทเดียว
      printCostResult = pc(frontColors + backColors);
      printCost = printCostResult.cost;
    } else {
      // sheetwise: พิมพ์ 2 รอบ (หน้า + หลัง)
      const front = pc(frontColors);
      const back = backColors > 0 ? pc(backColors) : { cost: 0, isApproximated: false, plateClassUsed: front.plateClassUsed };
      printCostResult = { cost: front.cost + back.cost, isApproximated: front.isApproximated || back.isApproximated, plateClassUsed: front.plateClassUsed };
      printCost = printCostResult.cost;
    }

    // ── ต้นทุนวัสดุ (Req 4) ──
    // Paper_Material: คิดตามน้ำหนัก Factory_Sheet × parentSheetCount (Req 1.5)
    // Sticker_Material: คิดตามพื้นที่ชิ้นสำเร็จ × จำนวน (Req 4.4)
    let materialBasis;
    let weightPerSheetGrams = 0;
    let totalWeightKg = 0;
    let materialCost = 0;
    let materialUnitPrice = 0;   // สำหรับ label
    if (isSticker) {
      materialBasis = 'area';
      const pieceAreaSqCm = size.width * size.height;
      materialUnitPrice = this.STICKER_PRICE_PER_SQCM[paperType];
      materialCost = materialUnitPrice * pieceAreaSqCm * quantity;
    } else {
      materialBasis = 'weight';
      // น้ำหนักต่อใบโรงงาน (กรัม) = (กว้าง × ยาว × แกรม) ÷ 10,000
      weightPerSheetGrams = (factoryWidth * factoryHeight * Number(gsm)) / 10000;
      // น้ำหนักรวม (กก.) = น้ำหนักต่อใบ × จำนวนใบโรงงาน ÷ 1000
      totalWeightKg = (weightPerSheetGrams * parentSheetCount) / 1000;
      materialUnitPrice = paperInfo.pricePerKg;
      materialCost = totalWeightKg * materialUnitPrice;
    }
    // ราคาขายวัสดุ +20% (Req 5.3)
    const paperCost = materialCost;
    const paperSellingPrice = materialCost * 1.20;

    // ราคารวมทั้งหมด = ค่าเพลท + ราคาขายวัสดุ + ค่าพิมพ์ (Req 7.12)
    const totalAmount = plateCost + paperSellingPrice + printCost;

    // Print method notes
    let methodNote = '';
    if (method === 'work-and-turn' || method === 'work-and-tumble') {
      methodNote = 'พิมพ์ 2 ด้านในรอบเดียว ใช้เพลท 1 ชุด (' + (method === 'work-and-turn' ? 'Work-and-Turn' : 'Work-and-Tumble') + '), ชิ้นสำเร็จ = ชิ้น/ใบ ÷ 2';
    } else if (method === 'sheetwise' && perSide.sides === 2) {
      methodNote = 'พิมพ์ 2 รอบ ใช้เพลทหน้า+หลัง (Sheetwise)';
    }

    // ชื่อวัสดุ + ป้ายราคาวัสดุ
    const materialName = isSticker
      ? (this.STICKER_LABEL[paperType] || paperType)
      : paperInfo.name;
    const materialPriceText = isSticker
      ? (materialUnitPrice.toFixed(3) + ' บาท/ตร.ซม.')
      : (paperInfo.pricePerKg.toFixed(2) + ' บาท/กก.');

    // สีต่อด้าน text
    const colorsText = (perSide.sides === 2)
      ? ('หน้า ' + frontColors + ' สี / หลัง ' + backColors + ' สี')
      : (frontColors + ' สี (1 หน้า)');

    // Build cost breakdown (ordered as specified)
    const costBreakdown = [
      { label: 'กระดาษโรงงาน', amount: 0, conditional: false, text: sheet.name + ' (' + factoryWidth.toFixed(1) + '×' + factoryHeight.toFixed(1) + ' ซม.)' },
      { label: 'ใบหลังตัด (เข้าเครื่อง)', amount: 0, conditional: false, text: cutWidth.toFixed(1) + '×' + cutHeight.toFixed(1) + ' ซม. — ตัดได้ ' + cutsPerParentSheet + ' ใบ/แผ่นโรงงาน' },
      { label: 'เครื่องพิมพ์', amount: 0, conditional: false, text: press.name + ' (รับสูงสุด ' + press.maxWidth + '×' + press.maxHeight + ' ซม.)' },
      { label: 'วัสดุ', amount: 0, conditional: false, text: materialName + ' — ' + materialPriceText },
      { label: 'พื้นที่พิมพ์ได้', amount: 0, conditional: false, text: printableWidth.toFixed(1) + '×' + printableHeight.toFixed(1) + ' ซม.' },
      { label: 'ขนาดชิ้นงาน (รวม bleed)', amount: 0, conditional: false, text: pieceWidth.toFixed(1) + '×' + pieceHeight.toFixed(1) + ' ซม.' },
      { label: 'ชิ้น/ใบพิมพ์ (n-up)', amount: nUp, conditional: false, unit: 'ชิ้น' },
      { label: 'ชิ้นสำเร็จ/ใบพิมพ์', amount: finishedPiecesPerSheet, conditional: false, unit: 'ชิ้น' },
      { label: 'จำนวนพิมพ์', amount: quantity, conditional: false, unit: 'ชิ้น' },
      { label: 'ใบพิมพ์ขั้นต่ำ', amount: minSheets, conditional: false, unit: 'ใบพิมพ์' },
      {
        label: 'กระดาษเสีย ' + profile.label + ' (Spoilage ' + (effectiveRate * 100).toFixed(1) + '%)' +
               (perfectingApplied ? ' + Perfecting ' + (perfectingExtra * 100).toFixed(1) + '%' : ''),
        amount: spoilageSheets, conditional: false, unit: 'ใบพิมพ์'
      },
      { label: 'ใบพิมพ์รวม', amount: printSheetsNeeded, conditional: false, unit: 'ใบพิมพ์' },
      { label: 'กระดาษโรงงานที่ใช้', amount: parentSheetCount, conditional: false, unit: 'แผ่น' },
    ];

    // วัสดุ: กระดาษแสดงน้ำหนัก, สติกเกอร์แสดงพื้นที่
    if (!isSticker) {
      costBreakdown.push({ label: 'น้ำหนักต่อแผ่นโรงงาน', amount: weightPerSheetGrams, conditional: false, unit: 'กรัม' });
      costBreakdown.push({ label: 'น้ำหนักรวม', amount: totalWeightKg, conditional: false, unit: 'กก.' });
    }

    costBreakdown.push({ label: 'จำนวนสี', amount: 0, conditional: false, text: colorsText });
    costBreakdown.push({
      label: 'ค่าเพลท (' + activePlateTable.name + ': ' + platePerColor + ' × ' + totalPlates + ' เพลท)',
      amount: plateCost, conditional: false
    });
    costBreakdown.push({ label: (isSticker ? 'ต้นทุนสติกเกอร์' : 'ต้นทุนกระดาษ'), amount: paperCost, conditional: false });
    costBreakdown.push({ label: 'ราคาขายวัสดุ (+20%)', amount: paperSellingPrice, conditional: false });
    costBreakdown.push({ label: 'ประเภทหมึก', amount: 0, conditional: false, text: inkType === 'uv' ? 'UV' : 'คอนเวนชั่นนัล' });
    costBreakdown.push({
      label: 'ค่าพิมพ์ (' + printCostResult.plateClassUsed + ' ' + (inkType === 'uv' ? 'UV' : 'คอนเวนชั่นนัล') + ')',
      amount: printCost, conditional: false
    });
    costBreakdown.push({ label: 'ราคารวมทั้งหมด', amount: totalAmount, conditional: false });

    // Insert note for spoilage minimum after Spoilage row (Req 12.9)
    if (spoilageHitMin) {
      const spoilageIdx = costBreakdown.findIndex(item =>
        typeof item.label === 'string' && item.label.startsWith('กระดาษเสีย'));
      if (spoilageIdx >= 0) {
        costBreakdown.splice(spoilageIdx + 1, 0, {
          label: '  หมายเหตุ', amount: 0, conditional: false,
          text: 'ใช้ขั้นต่ำกระดาษเสีย ' + profile.minSheets + ' ใบ'
        });
      }
    }

    // Insert note for approximated print cost (Req 7.13)
    if (printCostResult.isApproximated) {
      const printIdx = costBreakdown.findIndex(item =>
        typeof item.label === 'string' && item.label.startsWith('ค่าพิมพ์'));
      if (printIdx >= 0) {
        costBreakdown.splice(printIdx + 1, 0, {
          label: '  หมายเหตุ', amount: 0, conditional: false,
          text: 'ใช้อัตราค่าพิมพ์ของ ' + printCostResult.plateClassUsed + ' (ประมาณการ)'
        });
      }
    }

    if (methodNote) {
      costBreakdown.push({ label: 'หมายเหตุวิธีพิมพ์', amount: 0, conditional: false, text: methodNote });
    }

    return {
      success: true,
      system: 'pressSheet',
      productType: productType,
      costBreakdown: costBreakdown,
      totalPrice: totalAmount,
      unitPrice: finishedPiecesPerSheet,
      quantity: quantity,
      // Extra summary fields for UI
      summary: {
        totalSheets: printSheetsNeeded,
        minSheets: minSheets,
        spoilageSheets: spoilageSheets,
        piecesPerSheet: finishedPiecesPerSheet,
        nUp: nUp,
        finishedPiecesPerSheet: finishedPiecesPerSheet,
        // Cut sheet info (Req 1.8)
        cutWidth: cutWidth,
        cutHeight: cutHeight,
        cutsPerParentSheet: cutsPerParentSheet,
        parentSheetCount: parentSheetCount,
        // Per-side colors (Req 3.9)
        sides: perSide.sides,
        frontColors: frontColors,
        backColors: backColors,
        totalPlates: totalPlates,
        materialBasis: materialBasis,
        plateCost: plateCost,
        paperCost: paperCost,
        paperSellingPrice: paperSellingPrice,
        printCost: printCost,
        inkType: inkType,
        plateClassUsed: printCostResult.plateClassUsed,
        spoilageProfile: resolvedJobType,
        spoilageRate: profile.rate,
        effectiveSpoilageRate: effectiveRate,
        perfectingApplied: perfectingApplied,
        perfectingExtra: perfectingExtra,
        plateCostTableName: activePlateTable.name,
        platePerColor: platePerColor,
      },
      error: null
    };
  },

  /**
   * คำนวณค่าพิมพ์ตามตาราง Heidelberg
   * @param {string} plateSize    - 'ตัด 4' | 'ตัด 2' (fallback 'ตัด 1' → 'ตัด 2', 'ตัด 8' → 'ตัด 4')
   * @param {string} inkType      - 'conventional' | 'uv'
   * @param {number} totalSheets  - จำนวนใบพิมพ์รวม (รวม spoilage)
   * @param {number} colorCount   - จำนวนสี
   * @param {string} printMethod  - 'sheetwise' = ×2, อื่นๆ = ×1
   * @returns {{cost: number, isApproximated: boolean, plateClassUsed: string}}
   */
  calculatePrintCost(plateSize, inkType, totalSheets, colorCount, printMethod) {
    // Normalize plateSize: extract base class from strings like "ตัด 4 (B2)" → "ตัด 4"
    let normalizedPlate = plateSize;
    if (typeof plateSize === 'string') {
      const match = plateSize.match(/ตัด\s*\d+/);
      if (match) normalizedPlate = match[0].replace(/\s+/, ' ');
    }

    // Fallback rule (Req 7.13)
    const PLATE_FALLBACK = { 'ตัด 1': 'ตัด 2', 'ตัด 8': 'ตัด 4' };
    let plateClass = normalizedPlate;
    let isApproximated = false;
    if (!this.PRINT_COST_TABLE[plateClass]) {
      if (PLATE_FALLBACK[plateClass]) {
        plateClass = PLATE_FALLBACK[plateClass];
        isApproximated = true;
      } else {
        plateClass = 'ตัด 4'; // last resort
        isApproximated = true;
      }
    }

    // Default inkType
    const ink = (inkType === 'uv') ? 'uv' : 'conventional';
    const tiers = this.PRINT_COST_TABLE[plateClass][ink];

    // หา tier แรกที่ totalSheets ≤ upTo
    let baseRate = 0;
    let overageCost = 0;
    let prevUpTo = 0;
    for (const tier of tiers) {
      if (totalSheets <= tier.upTo) {
        baseRate = tier.flatRate;
        // ถ้า prevUpTo > 0 หมายถึงข้ามมาจาก tier ก่อนหน้า
        if (prevUpTo > 0) {
          overageCost = (totalSheets - prevUpTo) * tier.overageRate;
        }
        break;
      }
      prevUpTo = tier.upTo;
    }

    const sheetwiseMultiplier = (printMethod === 'sheetwise') ? 2 : 1;
    const cost = (baseRate * colorCount + overageCost * colorCount) * sheetwiseMultiplier;

    return { cost, isApproximated, plateClassUsed: plateClass };
  },

  /**
   * Calculate area in square centimeters
   * @param {number} width - Width in cm
   * @param {number} height - Height in cm
   * @returns {number} Area in sq cm
   */
  calculateArea(width, height) {
    return width * height;
  },

  /**
   * Calculate plate/block cost
   * @param {number} colors - Number of colors
   * @param {number} plateRate - Cost per plate/block
   * @returns {number} Total plate cost
   */
  calculatePlateCost(colors, plateRate) {
    return colors * plateRate;
  },

  /**
   * Calculate material cost
   * @param {number} area - Area in sq cm
   * @param {number} qty - Quantity
   * @param {number} materialRate - Price per sq cm
   * @returns {number} Total material cost
   */
  calculateMaterialCost(area, qty, materialRate) {
    return area * qty * materialRate;
  },

  /**
   * Calculate finishing cost for industrial offset
   * Returns an array of finishing line items (each with label and amount)
   * Pricing logic per finishing type:
   *   - pricePerSqCm: cost = pricePerSqCm × area × qty (laminate, spotUV for sticker/label/box)
   *   - pricePerPiece: cost = pricePerPiece × qty (dieCut, emboss, embossStamp, and book/catalog finishing)
   *   - pricePerSheet: cost = pricePerSheet × qty (laminate, spotUV for brochure/leaflet)
   * @param {string[]} options - Array of finishing option keys
   * @param {object} size - { width, height, depth? } in cm
   * @param {number} qty - Quantity
   * @param {object} finishingRates - Finishing rate table from price table
   * @param {string} productType - Product type key
   * @param {number} [pageCount] - Page count (for book/catalog)
   * @returns {Array<{label: string, amount: number}>} Array of finishing line items
   */
  calculateFinishingCost(options, size, qty, finishingRates, productType, pageCount) {
    const items = [];
    if (!options || !Array.isArray(options) || options.length === 0) {
      return items;
    }
    if (!finishingRates || typeof finishingRates !== 'object') {
      return items;
    }

    for (const optionKey of options) {
      const rate = finishingRates[optionKey];
      if (!rate) continue;

      let amount = 0;
      const label = rate.name || optionKey;

      if (rate.pricePerSqCm !== undefined) {
        // Area-based finishing (laminate, spotUV for sticker/label/box)
        let area;
        if (productType === 'box') {
          const w = size.width;
          const h = size.height;
          const d = size.depth || 0;
          area = 2 * (w * h + w * d + h * d);
        } else {
          area = size.width * size.height;
        }
        amount = rate.pricePerSqCm * area * qty;
      } else if (rate.pricePerSheet !== undefined) {
        // Sheet-based finishing (laminate, spotUV for brochure/leaflet)
        amount = rate.pricePerSheet * qty;
      } else if (rate.pricePerPiece !== undefined) {
        // Piece-based finishing (dieCut, emboss, embossStamp, book/catalog finishing)
        amount = rate.pricePerPiece * qty;
      }

      if (amount > 0) {
        items.push({ label: label, amount: amount });
      }
    }

    return items;
  },

  /**
   * Format currency as Thai Baht — ฿X,XXX.XX with comma separators
   * @param {number} amount - Non-negative number to format
   * @returns {string} Formatted string e.g. "฿1,234.50"
   */
  formatCurrency(amount) {
    const fixed = amount.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    // Add comma separators every 3 digits from the right
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '฿' + withCommas + '.' + decPart;
  },

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Find per-sheet price from digital offset quantity-based tiers
   * @param {Array} tiers - [{minQty, maxQty, pricePerSheet}]
   * @param {number} qty - Quantity to look up
   * @returns {number|null} Price per sheet or null if not found
   */
  _findDigitalOffsetTierPrice(tiers, qty) {
    if (!tiers || !Array.isArray(tiers)) return null;
    for (const tier of tiers) {
      if (qty >= tier.minQty && qty <= tier.maxQty) {
        return tier.pricePerSheet;
      }
    }
    return null;
  },

  /**
   * Find price from quantity-based tiers
   * @param {Array} tiers - [{minQty, maxQty, pricePerUnit}]
   * @param {number} qty - Quantity to look up
   * @returns {number|null} Price per unit or null if not found
   */
  _findTierPrice(tiers, qty) {
    if (!tiers || !Array.isArray(tiers)) return null;
    for (const tier of tiers) {
      if (qty >= tier.minQty && qty <= tier.maxQty) {
        return tier.pricePerUnit;
      }
    }
    return null;
  },

  /**
   * Find price from size-based tiers (for fabric bags)
   * @param {Array} tiers - [{minSize, maxSize, price}]
   * @param {number} area - Bag area (width × height)
   * @returns {number|null} Price per bag or null if not found
   */
  _findSizeTierPrice(tiers, area) {
    if (!tiers || !Array.isArray(tiers)) return null;
    for (const tier of tiers) {
      if (area >= tier.minSize && area <= tier.maxSize) {
        return tier.price;
      }
    }
    return null;
  },

  /**
   * Find cost from area-based tiers (for die-cut)
   * @param {Array} tiers - [{minArea, maxArea, cost}]
   * @param {number} area - Area value
   * @returns {number|null} Cost or null if not found
   */
  _findAreaTierCost(tiers, area) {
    if (!tiers || !Array.isArray(tiers)) return null;
    for (const tier of tiers) {
      if (area >= tier.minArea && area <= tier.maxArea) {
        return tier.cost;
      }
    }
    return null;
  },

  /**
   * Create an error result object
   * @param {string} system
   * @param {string} productType
   * @param {object} specs
   * @param {string} errorMessage
   * @returns {CalculationResult}
   */
  _errorResult(system, productType, specs, errorMessage) {
    return {
      success: false,
      system: system,
      productType: productType,
      costBreakdown: [],
      totalPrice: 0,
      unitPrice: 0,
      quantity: (specs && specs.quantity) || 0,
      error: errorMessage
    };
  }
};

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PricingEngine;
}
