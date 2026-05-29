/**
 * Admin Pricing Panel
 * จัดการตารางราคาสำหรับทุกระบบพิมพ์
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
const AdminPricing = {
  currentSystem: 'screen',
  priceTable: null,
  messageTimeout: null,

  // System and product type labels in Thai
  SYSTEM_LABELS: {
    screen: 'ซิลค์สกรีน',
    digitalOffset: 'ดิจิทัล Offset',
    industrialOffset: 'Offset อุตสาหกรรม',
    inkjet: 'อิงค์เจ็ท'
  },

  PRODUCT_LABELS: {
    screen: {
      sticker: 'สติกเกอร์',
      box: 'กล่อง',
      fabricBag: 'ถุงผ้า',
      label: 'ฉลากสินค้า'
    },
    digitalOffset: {
      sticker: 'สติกเกอร์',
      label: 'ฉลากสินค้า',
      boxSmall: 'กล่องจำนวนน้อย',
      businessCard: 'นามบัตร'
    },
    industrialOffset: {
      sticker: 'สติกเกอร์',
      label: 'ฉลากสินค้า',
      box: 'กล่อง',
      brochure: 'โบรชัวร์',
      leaflet: 'แผ่นพับ',
      book: 'หนังสือ',
      catalog: 'แคตตาล็อก'
    },
    inkjet: {
      vinylSign: 'ป้ายไวนิล',
      largeSticker: 'สติกเกอร์ขนาดใหญ่',
      banner: 'แบนเนอร์',
      poster: 'โปสเตอร์'
    }
  },

  /**
   * Initialize — load price table and render
   */
  init() {
    this.priceTable = StorageManager.loadPriceTable();
    this.setupTabListeners();
    this.renderPriceTable(this.currentSystem);
  },

  /**
   * Set up tab click listeners
   */
  setupTabListeners() {
    const tabs = document.querySelectorAll('.pricing-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentSystem = e.target.dataset.system;
        this.renderPriceTable(this.currentSystem);
      });
    });
  },

  /**
   * Render editable price table for a given system
   * @param {string} system - system key (screen, digitalOffset, etc.)
   */
  renderPriceTable(system) {
    const container = document.getElementById('pricingTableContainer');
    if (!container) return;

    const systemData = this.priceTable[system];
    if (!systemData) {
      container.innerHTML = '<p style="text-align:center;color:var(--g400);padding:40px">ไม่พบข้อมูลราคาสำหรับระบบนี้</p>';
      return;
    }

    const productLabels = this.PRODUCT_LABELS[system] || {};
    let html = '';

    for (const [productType, productData] of Object.entries(systemData)) {
      const productLabel = productLabels[productType] || productType;
      html += this.renderProductSection(system, productType, productLabel, productData);
    }

    container.innerHTML = html;
  },

  /**
   * Render a single product type section with editable fields
   */
  renderProductSection(system, productType, productLabel, productData) {
    let html = `<div class="pricing-product-section" data-system="${system}" data-product="${productType}">`;
    html += `<div class="pricing-product-header"><h3>${productLabel}</h3>`;
    html += `<button class="btn-save btn-save-sm" onclick="AdminPricing.handleSave('${system}','${productType}')">บันทึก</button></div>`;
    html += '<div class="pricing-product-body">';

    // Render plate cost if exists
    if (productData.plateCost !== undefined) {
      html += this.renderField(system, productType, 'plateCost', 'ค่าทำบล็อกต่อสี (บาท)', productData.plateCost);
    }
    if (productData.plateCostPerColor !== undefined) {
      html += this.renderField(system, productType, 'plateCostPerColor', 'ค่าเพลทต่อสี (บาท)', productData.plateCostPerColor);
    }

    // Render print cost tiers
    if (productData.printCostPerColor && productData.printCostPerColor.tiers) {
      html += this.renderTiersTable(system, productType, 'printCostPerColor', 'ค่าพิมพ์ต่อสี (ตามจำนวน)', productData.printCostPerColor.tiers);
    }
    if (productData.printCost && productData.printCost.tiers) {
      html += this.renderTiersTable(system, productType, 'printCost', 'ค่าพิมพ์ (ตามจำนวน)', productData.printCost.tiers);
    }
    if (productData.perSheetPrice && productData.perSheetPrice.tiers) {
      html += this.renderTiersTable(system, productType, 'perSheetPrice', 'ราคาต่อแผ่น (ตามจำนวน)', productData.perSheetPrice.tiers);
    }

    // Render price per sqm (inkjet)
    if (productData.pricePerSqM && typeof productData.pricePerSqM === 'object') {
      html += '<div class="pricing-subsection"><h4>ค่าพิมพ์ต่อตร.ม.</h4><div class="pricing-fields-row">';
      for (const [res, price] of Object.entries(productData.pricePerSqM)) {
        html += this.renderField(system, productType, `pricePerSqM.${res}`, res, price);
      }
      html += '</div></div>';
    }

    // Render materials
    if (productData.materials) {
      html += this.renderMaterialsTable(system, productType, productData.materials);
    }

    // Render media (inkjet)
    if (productData.media) {
      html += this.renderMediaTable(system, productType, productData.media);
    }

    // Render finishing
    if (productData.finishing) {
      html += this.renderFinishingTable(system, productType, productData.finishing);
    }

    // Render paper types (industrial offset)
    if (productData.paperTypes) {
      html += this.renderPaperTypesTable(system, productType, productData.paperTypes);
    }

    // Render binding types
    if (productData.bindingTypes) {
      html += this.renderBindingTypesTable(system, productType, productData.bindingTypes);
    }

    // Render die cut cost tiers
    if (productData.dieCutCost && productData.dieCutCost.tiers) {
      html += this.renderDieCutTable(system, productType, productData.dieCutCost.tiers);
    }

    html += '</div></div>';
    return html;
  },

  /**
   * Render a single editable field
   */
  renderField(system, productType, fieldPath, label, value) {
    const inputId = `price_${system}_${productType}_${fieldPath.replace(/\./g, '_')}`;
    return `<div class="pricing-field"><label for="${inputId}">${label}</label><input type="number" id="${inputId}" data-system="${system}" data-product="${productType}" data-field="${fieldPath}" value="${value}" min="0" step="any"></div>`;
  },

  /**
   * Render tier-based pricing table
   */
  renderTiersTable(system, productType, fieldKey, title, tiers) {
    let html = `<div class="pricing-subsection"><h4>${title}</h4>`;
    html += '<table class="pricing-tiers-table"><thead><tr><th>จำนวนขั้นต่ำ</th><th>จำนวนสูงสุด</th><th>ราคาต่อหน่วย (บาท)</th></tr></thead><tbody>';
    tiers.forEach((tier, idx) => {
      const priceField = tier.pricePerUnit !== undefined ? 'pricePerUnit' : 'pricePerSheet';
      const priceValue = tier[priceField];
      html += `<tr>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="${fieldKey}.tiers.${idx}.minQty" value="${tier.minQty}" min="0"></td>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="${fieldKey}.tiers.${idx}.maxQty" value="${tier.maxQty}" min="0"></td>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="${fieldKey}.tiers.${idx}.${priceField}" value="${priceValue}" min="0" step="any"></td>`;
      html += `</tr>`;
    });
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render materials table
   */
  renderMaterialsTable(system, productType, materials) {
    let html = '<div class="pricing-subsection"><h4>วัสดุ</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>วัสดุ</th><th>ราคา</th></tr></thead><tbody>';
    for (const [key, mat] of Object.entries(materials)) {
      let priceKey, priceValue;
      if (mat.pricePerSqCm !== undefined) {
        priceKey = 'pricePerSqCm';
        priceValue = mat.pricePerSqCm;
      } else if (mat.pricePerCard !== undefined) {
        priceKey = 'pricePerCard';
        priceValue = mat.pricePerCard;
      } else if (mat.pricePerBag !== undefined) {
        // Fabric bag has nested tiers — render differently
        html += `<tr><td colspan="2"><strong>${mat.name}</strong> (ราคาต่อใบ — ตามขนาด)</td></tr>`;
        if (mat.pricePerBag && mat.pricePerBag.tiers) {
          mat.pricePerBag.tiers.forEach((tier, idx) => {
            html += `<tr><td style="padding-left:24px">ขนาด ${tier.minSize}–${tier.maxSize} ตร.ซม.</td>`;
            html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="materials.${key}.pricePerBag.tiers.${idx}.price" value="${tier.price}" min="0" step="any"></td></tr>`;
          });
        }
        continue;
      } else {
        continue;
      }
      html += `<tr><td>${mat.name}</td><td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="materials.${key}.${priceKey}" value="${priceValue}" min="0" step="any"></td></tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render media table (inkjet)
   */
  renderMediaTable(system, productType, media) {
    let html = '<div class="pricing-subsection"><h4>วัสดุพิมพ์</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>วัสดุ</th><th>ราคาต่อ ตร.ม. (บาท)</th></tr></thead><tbody>';
    for (const [key, item] of Object.entries(media)) {
      html += `<tr><td>${item.name}</td><td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="media.${key}.pricePerSqM" value="${item.pricePerSqM}" min="0" step="any"></td></tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render finishing table
   */
  renderFinishingTable(system, productType, finishing) {
    let html = '<div class="pricing-subsection"><h4>ตกแต่งเพิ่มเติม</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>รายการ</th><th>ราคา</th></tr></thead><tbody>';
    for (const [key, item] of Object.entries(finishing)) {
      let priceKey, priceValue;
      if (item.pricePerSqCm !== undefined) { priceKey = 'pricePerSqCm'; priceValue = item.pricePerSqCm; }
      else if (item.pricePerPiece !== undefined) { priceKey = 'pricePerPiece'; priceValue = item.pricePerPiece; }
      else if (item.pricePerCard !== undefined) { priceKey = 'pricePerCard'; priceValue = item.pricePerCard; }
      else if (item.pricePerSqM !== undefined) { priceKey = 'pricePerSqM'; priceValue = item.pricePerSqM; }
      else if (item.pricePerMeter !== undefined) { priceKey = 'pricePerMeter'; priceValue = item.pricePerMeter; }
      else if (item.pricePerSheet !== undefined) { priceKey = 'pricePerSheet'; priceValue = item.pricePerSheet; }
      else { continue; }
      html += `<tr><td>${item.name}</td><td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="finishing.${key}.${priceKey}" value="${priceValue}" min="0" step="any"></td></tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render paper types table (industrial offset)
   */
  renderPaperTypesTable(system, productType, paperTypes) {
    let html = '<div class="pricing-subsection"><h4>ประเภทกระดาษ</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>กระดาษ</th><th>ราคาต่อแผ่น (บาท)</th></tr></thead><tbody>';
    for (const [key, item] of Object.entries(paperTypes)) {
      html += `<tr><td>${item.name}</td><td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="paperTypes.${key}.pricePerSheet" value="${item.pricePerSheet}" min="0" step="any"></td></tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render binding types table
   */
  renderBindingTypesTable(system, productType, bindingTypes) {
    let html = '<div class="pricing-subsection"><h4>ประเภทเข้าเล่ม</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>ประเภท</th><th>ราคาต่อหน้า (บาท)</th></tr></thead><tbody>';
    for (const [key, item] of Object.entries(bindingTypes)) {
      html += `<tr><td>${item.name}</td><td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="bindingTypes.${key}.costPerPage" value="${item.costPerPage}" min="0" step="any"></td></tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Render die cut cost table
   */
  renderDieCutTable(system, productType, tiers) {
    let html = '<div class="pricing-subsection"><h4>ค่าไดคัท (ตามพื้นที่)</h4>';
    html += '<table class="pricing-tiers-table"><thead><tr><th>พื้นที่ขั้นต่ำ (ตร.ซม.)</th><th>พื้นที่สูงสุด (ตร.ซม.)</th><th>ราคา (บาท)</th></tr></thead><tbody>';
    tiers.forEach((tier, idx) => {
      html += `<tr>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="dieCutCost.tiers.${idx}.minArea" value="${tier.minArea}" min="0"></td>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="dieCutCost.tiers.${idx}.maxArea" value="${tier.maxArea}" min="0"></td>`;
      html += `<td><input type="number" class="tier-input" data-system="${system}" data-product="${productType}" data-field="dieCutCost.tiers.${idx}.cost" value="${tier.cost}" min="0" step="any"></td>`;
      html += `</tr>`;
    });
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Validate a price input value
   * @param {*} value - value to validate
   * @returns {boolean} true if valid (numeric and >= 0)
   */
  validatePriceInput(value) {
    if (value === '' || value === null || value === undefined) return false;
    const num = Number(value);
    if (isNaN(num)) return false;
    if (num < 0) return false;
    return true;
  },

  /**
   * Handle save for a specific system/product type
   * Validates all inputs, saves to localStorage, syncs to Sheets
   * @param {string} system
   * @param {string} productType
   */
  handleSave(system, productType) {
    const section = document.querySelector(`.pricing-product-section[data-system="${system}"][data-product="${productType}"]`);
    if (!section) return;

    const inputs = section.querySelectorAll('input[type="number"]');
    let hasError = false;

    // Clear previous error highlights
    inputs.forEach(input => input.classList.remove('input-error'));

    // Validate all inputs
    for (const input of inputs) {
      if (!this.validatePriceInput(input.value)) {
        input.classList.add('input-error');
        hasError = true;
      }
    }

    if (hasError) {
      this.showMessage('กรุณากรอกราคาเป็นตัวเลขที่ไม่ติดลบ', 'error');
      return;
    }

    // Apply values to priceTable
    try {
      for (const input of inputs) {
        const fieldPath = input.dataset.field;
        const value = Number(input.value);
        this.setNestedValue(this.priceTable[system][productType], fieldPath, value);
      }

      // Update timestamp
      this.priceTable.lastUpdated = new Date().toISOString();

      // Save to localStorage
      StorageManager.savePriceTable(this.priceTable);

      // Attempt sync to Google Sheets (non-blocking)
      this.syncToSheets();

      this.showMessage('บันทึกราคาเรียบร้อยแล้ว', 'success');
    } catch (e) {
      console.error('AdminPricing: Save failed', e);
      this.showMessage('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  },

  /**
   * Set a nested value in an object using dot-notation path
   * @param {object} obj - target object
   * @param {string} path - dot-notation path (e.g., "printCostPerColor.tiers.0.pricePerUnit")
   * @param {*} value - value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = isNaN(keys[i]) ? keys[i] : Number(keys[i]);
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    const lastKey = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : Number(keys[keys.length - 1]);
    current[lastKey] = value;
  },

  /**
   * Sync to Google Sheets (non-blocking, best-effort)
   */
  syncToSheets() {
    // Non-blocking sync attempt
    try {
      if (StorageManager.SHEETS_API_URL && !StorageManager.SHEETS_API_URL.includes('YOUR_DEPLOYMENT_ID')) {
        fetch(StorageManager.SHEETS_API_URL + '?action=savePriceTable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.priceTable)
        }).catch(() => {
          // Silent fail — localStorage is the primary store
        });
      }
    } catch (e) {
      // Silent fail
    }
  },

  /**
   * Handle export — trigger JSON download
   */
  handleExport() {
    const result = StorageManager.exportJSON();
    if (result.success) {
      this.showMessage('ส่งออกข้อมูลราคาเรียบร้อยแล้ว', 'success');
    } else {
      this.showMessage(result.error || 'ไม่สามารถส่งออกข้อมูลได้', 'error');
    }
  },

  /**
   * Handle import — validate and load JSON file
   * @param {File} file
   */
  async handleImport(file) {
    if (!file) return;

    const result = await StorageManager.importJSON(file);
    if (result.success) {
      this.priceTable = result.data;
      this.renderPriceTable(this.currentSystem);
      this.showMessage('นำเข้าข้อมูลราคาเรียบร้อยแล้ว', 'success');
    } else {
      this.showMessage(result.error || 'ไม่สามารถนำเข้าข้อมูลได้', 'error');
    }

    // Reset file input so same file can be re-imported
    const fileInput = document.getElementById('importPricingFile');
    if (fileInput) fileInput.value = '';
  },

  /**
   * Show a message (success or error)
   * Success: auto-hide after 3 seconds
   * Error: auto-hide after 5 seconds or until dismissed
   * @param {string} text
   * @param {'success'|'error'} type
   */
  showMessage(text, type) {
    const el = document.getElementById('pricingMessage');
    if (!el) return;

    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    el.textContent = text;
    el.className = 'pricing-message ' + type;
    el.style.display = 'block';

    // Add dismiss button for errors
    if (type === 'error') {
      el.innerHTML = text + ' <button class="pricing-msg-dismiss" onclick="AdminPricing.hideMessage()">✕</button>';
    }

    const duration = type === 'success' ? 3000 : 5000;
    this.messageTimeout = setTimeout(() => {
      this.hideMessage();
    }, duration);
  },

  /**
   * Hide the message
   */
  hideMessage() {
    const el = document.getElementById('pricingMessage');
    if (el) {
      el.style.display = 'none';
      el.className = 'pricing-message';
    }
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
  }
};

// Make AdminPricing available globally
window.AdminPricing = AdminPricing;
