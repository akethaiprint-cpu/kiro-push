/**
 * Pricing Engine — Pure Calculation Logic
 * ไม่มี side effects, ทดสอบได้ง่าย
 * Module Pattern (object literal) for browser, also export for Vitest testing
 */
const PricingEngine = {
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
    const plateCost = this.calculatePlateCost(colorCount, productTable.plateCost);

    // 2. Find print cost per color from quantity tiers
    const printCostPerUnit = this._findTierPrice(productTable.printCostPerColor.tiers, quantity);
    if (printCostPerUnit === null) {
      return this._errorResult('screen', productType, specs, 'ไม่พบข้อมูลราคาสำหรับจำนวนที่เลือก');
    }
    const printSides = specs.printSides || 1;
    const printCost = printCostPerUnit * colorCount * quantity * printSides;

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
    const printingCost = perSheetPrice * sheetsUsed * printSides;

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
    const plateCost = this.calculatePlateCost(colorCount, productTable.plateCostPerColor);

    // 2. Calculate print cost
    // ค่าจ้างพิมพ์ Offset = ราคาเหมาต่อสี × จำนวนสี
    // ถ้าจำนวนเกิน flatRateMaxQty: (เหมา + ส่วนเกิน × overageRate) × จำนวนสี
    let printCost = 0;
    const printData = productTable.printCost;

    if (!printData) {
      return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับรายการที่เลือก');
    }

    const printSides = specs.printSides || 1;

    if (printData.flatRate !== undefined) {
      // New format: flatRate + overage
      const flatRate = printData.flatRate;
      const flatRateMaxQty = printData.flatRateMaxQty || 10000;
      const overageRate = printData.overageRate || 0;

      if (quantity <= flatRateMaxQty) {
        // ไม่เกิน flatRateMaxQty: คิดเหมา
        printCost = flatRate * colorCount * printSides;
      } else {
        // เกิน: เหมา + (ส่วนเกิน × overageRate) ต่อสี
        const overageQty = quantity - flatRateMaxQty;
        printCost = (flatRate + overageRate * overageQty) * colorCount * printSides;
      }
    } else if (printData.tiers) {
      // Legacy format: per-unit tiers
      const printCostPerUnit = this._findTierPrice(printData.tiers, quantity);
      if (printCostPerUnit === null) {
        return this._errorResult('industrialOffset', productType, specs, 'ไม่พบข้อมูลราคาสำหรับจำนวนที่เลือก');
      }
      printCost = printCostPerUnit * quantity * colorCount * printSides;
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

    // 1. Print cost = pricePerSqM[resolution] × area × qty × printSides
    const printPricePerSqM = productTable.pricePerSqM[resolution];
    const printSides = specs.printSides || 1;
    const printCost = printPricePerSqM * areaSqM * quantity * printSides;

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

  // ─── Helper Functions ───────────────────────────────────────────────

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
