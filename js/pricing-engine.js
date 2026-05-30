/**
 * Pricing Engine — Pure Calculation Logic
 * ไม่มี side effects, ทดสอบได้ง่าย
 * Module Pattern (object literal) for browser, also export for Vitest testing
 */
const PricingEngine = {
  /**
   * Press machine specifications — ขนาดรับกระดาษและค่าเพลท
   * Used by calculatePressSheet to validate paper fit and compute plate cost.
   * @typedef {object} MachineSpec
   * @property {string} name - Display name
   * @property {number} maxWidth - Max paper width in cm
   * @property {number} maxHeight - Max paper height in cm
   * @property {number} plateCostPerColor - Plate cost per color in baht
   * @property {string} [hint] - Optional hint shown when paper doesn't fit
   */
  MACHINE_SPECS: {
    'heidelberg_gto46': { name: 'Heidelberg GTO 46',           maxWidth: 46,  maxHeight: 34, plateCostPerColor: 200, plateSize: 'ตัด 8 (เล็ก)',   hint: 'งานเล็ก ปริมาณน้อย รับกระดาษไม่เกิน 46×34 ซม.' },
    'heidelberg_mo':    { name: 'Heidelberg MO (MOZ/MOV)',     maxWidth: 48,  maxHeight: 65, plateCostPerColor: 300, plateSize: 'ตัด 4 (B2)',    hint: 'B2 นิยมในไทย รับสูงสุด 48×65 ซม. (เช่น 19×25 นิ้ว)' },
    'heidelberg_movp':  { name: 'Heidelberg MOVP (Perfector)', maxWidth: 48,  maxHeight: 65, plateCostPerColor: 300, plateSize: 'ตัด 4 (B2)',    hint: 'พิมพ์ 2 ด้านรอบเดียว รับสูงสุด 48×65 ซม.' },
    'heidelberg_sm52':  { name: 'Heidelberg SM52',             maxWidth: 52,  maxHeight: 37, plateCostPerColor: 250, plateSize: 'ตัด 8 (กลาง)', hint: 'รับสูงสุด 52×37 ซม.' },
    'heidelberg_sm74':  { name: 'Heidelberg SM74',             maxWidth: 74,  maxHeight: 52, plateCostPerColor: 500, plateSize: 'ตัด 2 (B2+)',   hint: 'B2+ สมรรถนะสูง รับสูงสุด 74×52 ซม. (เช่น 24×35, 25×36 นิ้ว)' },
    'heidelberg_cd102': { name: 'Heidelberg CD102 / XL102',    maxWidth: 102, maxHeight: 72, plateCostPerColor: 600, plateSize: 'ตัด 1 (B1)',    hint: 'B1 รับสูงสุด 102×72 ซม. (เช่น 31×43 นิ้ว)' },
    'komori_s40':       { name: 'Komori Lithrone S40',         maxWidth: 106, maxHeight: 75, plateCostPerColor: 700, plateSize: 'ตัด 1 (B1)',    hint: 'B1 สมรรถนะสูงสุด รับสูงสุด 106×75 ซม.' },
    'heidelberg_gto52': { name: 'Heidelberg GTO 52',           maxWidth: 52,  maxHeight: 36, plateCostPerColor: 250, plateSize: 'ตัด 4',         hint: 'งานเล็ก ปริมาณน้อย รับสูงสุด 52×36 ซม. (A3+)' },
    'heidelberg_sx52':  { name: 'Heidelberg SX52',             maxWidth: 52,  maxHeight: 74, plateCostPerColor: 450, plateSize: 'ตัด 2',         hint: 'B2 รับสูงสุด 52×74 ซม.' },
    'heidelberg_sx74':  { name: 'Heidelberg SX74',             maxWidth: 53,  maxHeight: 74, plateCostPerColor: 500, plateSize: 'ตัด 2',         hint: 'B2+ สมรรถนะสูง รับสูงสุด 53×74 ซม.' },
    'heidelberg_xl75':  { name: 'Heidelberg XL75',             maxWidth: 53,  maxHeight: 75, plateCostPerColor: 550, plateSize: 'ตัด 2',         hint: 'B2+ XL series รับสูงสุด 53×75 ซม.' },
    'heidelberg_xl106': { name: 'Heidelberg XL106',            maxWidth: 75,  maxHeight: 106, plateCostPerColor: 700, plateSize: 'ตัด 1',         hint: 'B1 สมรรถนะสูงสุด รับสูงสุด 75×106 ซม.' },
    'heidelberg_sx102': { name: 'Heidelberg SX102',            maxWidth: 72,  maxHeight: 102, plateCostPerColor: 650, plateSize: 'ตัด 1',         hint: 'B1 รับสูงสุด 72×102 ซม.' },
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
      if (!materialData || !materialData.pricePerSqCm) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาวัสดุที่เลือก');
      }
      paperCost = materialData.pricePerSqCm * area * quantity;
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
    if (!gsm) {
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
    };

    const sheet = sheetSizes[sheetSize];
    if (!sheet) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบขนาดกระดาษที่เลือก');
    }

    // Press machine specs (ขนาดรับกระดาษ + ค่าเพลทต่อสี)
    // hint: คำแนะนำเมื่อใส่ไม่ได้
    const press = PricingEngine.MACHINE_SPECS[pressType];
    if (!press) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบเครื่องพิมพ์ที่เลือก');
    }

    // Check if paper fits the press (check both orientations)
    const fitsNormal = (sheet.width <= press.maxWidth && sheet.height <= press.maxHeight);
    const fitsRotated = (sheet.height <= press.maxWidth && sheet.width <= press.maxHeight);
    if (!fitsNormal && !fitsRotated) {
      const hint = press.hint ? ' — ' + press.hint : '';
      return this._errorResult('pressSheet', productType, specs,
        '⚠️ กระดาษ ' + sheet.name + ' (' + sheet.width.toFixed(1) + '×' + sheet.height.toFixed(1) + ' ซม.) ไม่สามารถใช้กับ ' + press.name + ' ได้' + hint);
    }

    // Look up paper price per kg using existing paper price table
    const paperInfo = this.getPaperPricePerKg(paperType, Number(gsm));
    if (!paperInfo) {
      return this._errorResult('pressSheet', productType, specs, 'ไม่พบราคากระดาษสำหรับ ' + paperType + ' ' + gsm + ' แกรม');
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

    const printableWidth = sheet.width - gripperMargin;
    const printableHeight = sheet.height - sideLay;

    // Bleed allowance: 0.6 cm per axis (3mm per side × 2 sides)
    const bleed = 0.6;
    const pieceWidth = size.width + bleed;
    const pieceHeight = size.height + bleed;

    // Calculate pieces per sheet (try both orientations)
    const piecesNormal = Math.floor(printableWidth / pieceWidth) * Math.floor(printableHeight / pieceHeight);
    const piecesRotated = Math.floor(printableWidth / pieceHeight) * Math.floor(printableHeight / pieceWidth);
    const piecesPerSheet = Math.max(piecesNormal, piecesRotated);

    if (piecesPerSheet <= 0) {
      return this._errorResult('pressSheet', productType, specs, 'ชิ้นงานใหญ่เกินกว่าจะวางบนกระดาษที่เลือกได้');
    }

    // Spoilage percentage based on job type
    const spoilageRates = {
      'simple': 0.05,         // งาน 1-2 สี = 5%
      'fourColor': 0.08,      // งาน 4 สี = 8%
      'fourColorFirst': 0.10, // งาน 4 สี ครั้งแรก = 10% (Req 6.3)
      'newJob': 0.10,         // งานใหม่ = 10%
    };
    const SPOILAGE_MIN_SHEETS = 300; // ขั้นต่ำกระดาษเสีย (Req 6.5)
    const spoilageRate = spoilageRates[jobType] || 0.05;

    // Minimum press sheets (before spoilage)
    const minSheets = Math.ceil(quantity / piecesPerSheet);

    // Spoilage with 300-sheet minimum (Req 6.5–6.6)
    const spoilageRaw = Math.ceil(minSheets * spoilageRate);
    const spoilageSheets = Math.max(spoilageRaw, SPOILAGE_MIN_SHEETS);
    const totalSheets = minSheets + spoilageSheets;
    const spoilageHitMin = (spoilageRaw < SPOILAGE_MIN_SHEETS); // true ถ้าใช้ขั้นต่ำ

    // Plate cost = ค่าเพลทต่อสี × จำนวนสี × (Sheetwise=2, อื่นๆ=1)
    const colors = colorCount || 1;
    const method = printMethod || 'single';
    const plateSets = (method === 'sheetwise') ? 2 : 1;
    const plateCost = press.plateCostPerColor * colors * plateSets;

    // Print Cost (Req 7) — คำนวณค่าพิมพ์จากตาราง Heidelberg
    const inkType = (specs.inkType === 'uv') ? 'uv' : 'conventional';
    const printCostResult = this.calculatePrintCost(press.plateSize, inkType, totalSheets, colors, method);
    const printCost = printCostResult.cost;

    // Paper cost calculation
    // น้ำหนักต่อใบ (กรัม) = (กว้าง × ยาว × แกรม) ÷ 10,000
    const weightPerSheetGrams = (sheet.width * sheet.height * Number(gsm)) / 10000;
    // น้ำหนักรวม (กก.) = น้ำหนักต่อใบ × ใบพิมพ์รวม ÷ 1000
    const totalWeightKg = (weightPerSheetGrams * totalSheets) / 1000;
    // ต้นทุนกระดาษ = น้ำหนักรวม × ราคา/กก.
    const paperCost = totalWeightKg * paperInfo.pricePerKg;
    // ราคาขายกระดาษ +20%
    const paperSellingPrice = paperCost * 1.20;

    // ราคารวมทั้งหมด = ค่าเพลท + ราคาขายกระดาษ + ค่าพิมพ์ (Req 7.12)
    const totalAmount = plateCost + paperSellingPrice + printCost;

    // Print method notes
    let methodNote = '';
    if (method === 'work-and-turn' || method === 'work-and-tumble') {
      methodNote = 'พิมพ์ 2 ด้านในรอบเดียว ใช้เพลท 1 ชุด (' + (method === 'work-and-turn' ? 'Work-and-Turn' : 'Work-and-Tumble') + ')';
    } else if (method === 'sheetwise') {
      methodNote = 'พิมพ์ 2 รอบ ใช้เพลท 2 ชุด (Sheetwise)';
    }

    // Build cost breakdown (ordered as specified)
    const costBreakdown = [
      { label: 'ขนาดกระดาษ', amount: 0, conditional: false, text: sheet.name + ' (' + sheet.width.toFixed(1) + '×' + sheet.height.toFixed(1) + ' ซม.)' },
      { label: 'เครื่องพิมพ์', amount: 0, conditional: false, text: press.name + ' (รับสูงสุด ' + press.maxWidth + '×' + press.maxHeight + ' ซม.)' },
      { label: 'ชนิดกระดาษ', amount: 0, conditional: false, text: paperInfo.name + ' — ' + paperInfo.pricePerKg.toFixed(2) + ' บาท/กก.' },
      { label: 'พื้นที่พิมพ์ได้', amount: 0, conditional: false, text: printableWidth.toFixed(1) + '×' + printableHeight.toFixed(1) + ' ซม.' },
      { label: 'ขนาดชิ้นงาน (รวม bleed)', amount: 0, conditional: false, text: pieceWidth.toFixed(1) + '×' + pieceHeight.toFixed(1) + ' ซม.' },
      { label: 'ชิ้น/ใบพิมพ์', amount: piecesPerSheet, conditional: false, unit: 'ชิ้น' },
      { label: 'จำนวนพิมพ์', amount: quantity, conditional: false, unit: 'ชิ้น' },
      { label: 'ใบพิมพ์ขั้นต่ำ', amount: minSheets, conditional: false, unit: 'ใบพิมพ์' },
      { label: 'กระดาษเสีย (Spoilage ' + (spoilageRate * 100).toFixed(0) + '%)', amount: spoilageSheets, conditional: false, unit: 'ใบพิมพ์' },
      { label: 'ใบพิมพ์รวม', amount: totalSheets, conditional: false, unit: 'ใบพิมพ์' },
      { label: 'น้ำหนักต่อใบพิมพ์', amount: weightPerSheetGrams, conditional: false, unit: 'กรัม' },
      { label: 'น้ำหนักรวม', amount: totalWeightKg, conditional: false, unit: 'กก.' },
      { label: 'จำนวนสี', amount: colors, conditional: false, unit: 'สี' },
      { label: 'ค่าเพลท (' + press.plateCostPerColor + ' × ' + colors + ' สี × ' + plateSets + ' ชุด)', amount: plateCost, conditional: false },
      { label: 'ต้นทุนกระดาษ', amount: paperCost, conditional: false },
      { label: 'ราคาขายกระดาษ (+20%)', amount: paperSellingPrice, conditional: false },
      { label: 'ประเภทหมึก', amount: 0, conditional: false,
        text: inkType === 'uv' ? 'UV' : 'คอนเวนชั่นนัล' },
      { label: 'ค่าพิมพ์ (' + printCostResult.plateClassUsed + ' ' + (inkType === 'uv' ? 'UV' : 'คอนเวนชั่นนัล') + ')',
        amount: printCost, conditional: false },
      { label: 'ราคารวมทั้งหมด', amount: totalAmount, conditional: false },
    ];

    // Insert note for 300-sheet minimum after Spoilage row (Req 6.8)
    if (spoilageHitMin) {
      const spoilageIdx = costBreakdown.findIndex(item =>
        typeof item.label === 'string' && item.label.startsWith('กระดาษเสีย'));
      if (spoilageIdx >= 0) {
        costBreakdown.splice(spoilageIdx + 1, 0, {
          label: '  หมายเหตุ', amount: 0, conditional: false,
          text: 'ใช้ขั้นต่ำกระดาษเสีย 300 ใบ'
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
      unitPrice: piecesPerSheet,
      quantity: quantity,
      // Extra summary fields for UI
      summary: {
        totalSheets: totalSheets,
        minSheets: minSheets,
        spoilageSheets: spoilageSheets,
        piecesPerSheet: piecesPerSheet,
        plateCost: plateCost,
        paperCost: paperCost,
        paperSellingPrice: paperSellingPrice,
        printCost: printCost,
        inkType: inkType,
        plateClassUsed: printCostResult.plateClassUsed,
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
