/**
 * Calculator UI Controller
 * จัดการ UI interactions ทั้งหมดของระบบคำนวณราคาสิ่งพิมพ์
 */
const Calculator = {
  currentSystem: null,
  currentProduct: null,
  lastResult: null,
  lastSpecs: null,
  priceTable: null,

  /**
   * Product types per printing system
   */
  PRODUCT_TYPES: {
    screen: [
      { key: 'sticker', name: 'สติกเกอร์' },
      { key: 'box', name: 'กล่อง' },
      { key: 'fabricBag', name: 'ถุงผ้า' },
      { key: 'label', name: 'ฉลากสินค้า' },
    ],
    digitalOffset: [
      { key: 'sticker', name: 'สติกเกอร์' },
      { key: 'label', name: 'ฉลากสินค้า' },
      { key: 'boxSmall', name: 'กล่องจำนวนน้อย' },
      { key: 'businessCard', name: 'นามบัตร' },
    ],
    industrialOffset: [
      { key: 'sticker', name: 'สติกเกอร์' },
      { key: 'label', name: 'ฉลากสินค้า' },
      { key: 'box', name: 'กล่อง' },
      { key: 'brochure', name: 'โบรชัวร์' },
      { key: 'leaflet', name: 'แผ่นพับ' },
      { key: 'book', name: 'หนังสือ' },
      { key: 'catalog', name: 'แคตตาล็อก' },
    ],
    inkjet: [
      { key: 'vinylSign', name: 'ป้ายไวนิล' },
      { key: 'largeSticker', name: 'สติกเกอร์ขนาดใหญ่' },
      { key: 'banner', name: 'แบนเนอร์' },
      { key: 'poster', name: 'โปสเตอร์' },
    ],
    paperCalc: [
      { key: 'woodfree', name: 'กระดาษปอนด์ (Woodfree)' },
      { key: 'artPaper', name: 'อาร์ตมัน/ด้าน (Art Paper)' },
      { key: 'artBoard', name: 'อาร์ตการ์ด (Art Board)' },
      { key: 'ivoryBoard', name: 'อาร์ตการ์ด 1 หน้า (ไอวอรี่)' },
      { key: 'greyBack', name: 'กล่องแป้งหลังเทา' },
      { key: 'kraft', name: 'คราฟท์' },
      { key: 'cardWhite', name: 'กระดาษการ์ดขาว' },
    ],
    pressSheet: [
      { key: 'general', name: 'คำนวณใบพิมพ์ทั่วไป' },
    ],
  },

  /**
   * Session storage key for retaining selections
   */
  SESSION_KEY: 'tp_calculator_session',

  /**
   * ขนาดงานสำเร็จมาตรฐาน (ซม.) — ใช้ใน dropdown ขนาดมาตรฐาน + auto-fill ช่องกว้าง/ยาว
   * label แสดงในวงเล็บพร้อมขนาด
   */
  STANDARD_SIZES: {
    'A6':         { label: 'A6',                 width: 10.5, height: 14.8 },
    'A5':         { label: 'A5',                 width: 14.8, height: 21.0 },
    'A4':         { label: 'A4',                 width: 21.0, height: 29.7 },
    'A3':         { label: 'A3',                 width: 29.7, height: 42.0 },
    'A2':         { label: 'A2',                 width: 42.0, height: 59.4 },
    'B5':         { label: 'B5',                 width: 17.6, height: 25.0 },
    'B4':         { label: 'B4',                 width: 25.0, height: 35.3 },
    'nameCard':   { label: 'นามบัตร',            width: 9.0,  height: 5.5 },
    'postcard':   { label: 'โปสการ์ด',           width: 10.0, height: 15.0 },
    'dl':         { label: 'แผ่นพับ DL (1/3 A4)', width: 9.9,  height: 21.0 },
    'cd':         { label: 'ปกซีดี',             width: 12.0, height: 12.0 },
    'poster_a2':  { label: 'โปสเตอร์ A2',        width: 42.0, height: 59.4 },
    'poster_a1':  { label: 'โปสเตอร์ A1',        width: 59.4, height: 84.1 },
  },

  /**
   * Initialize calculator — load price tables, set up event listeners, restore session
   */
  init() {
    // Load price table
    this.priceTable = StorageManager.loadPriceTable();

    // Set up system card event listeners
    const systemGrid = document.getElementById('systemGrid');
    if (systemGrid) {
      systemGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.system-card');
        if (card) {
          const system = card.getAttribute('data-system');
          if (system) {
            this.selectSystem(system);
          }
        }
      });
    }

    // Set up product grid event listener (delegated)
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
      productGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.product-btn');
        if (btn) {
          const product = btn.getAttribute('data-product');
          if (product) {
            this.selectProduct(product);
          }
        }
      });
    }

    // Set up reset button
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.clearForm();
      });
    }

    // Set up form submit event
    const calcForm = document.getElementById('calcForm');
    if (calcForm) {
      calcForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Set up print button event
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        this.handlePrint();
      });
    }

    // Set up quantity change listener (delegated, since form is dynamic)
    const formSection = document.getElementById('formSection');
    if (formSection) {
      formSection.addEventListener('input', (e) => {
        if (!e.target) return;
        if (e.target.id === 'inputQuantity') {
          this.handleQuantityChange(e.target.value);
        }
        // กรอกสีด้านหลัง > 0 → สลับเป็นพิมพ์ 2 หน้าอัตโนมัติ
        if (e.target.id === 'inputBackColors') {
          this._syncSidesFromBackColors();
        }
        // Quick Select recompute (debounced) on number input changes (Req 2.1, 3.1, 4.1)
        if (this.currentSystem === 'pressSheet' &&
            ['inputQuantity', 'inputWidth', 'inputHeight', 'inputColorCount', 'inputFrontColors', 'inputBackColors'].includes(e.target.id)) {
          this._debounceQuickSelectUpdate();
        }
      });

      // pressSheet: cascade gsm options when paperType changes + trigger Quick Select
      formSection.addEventListener('change', (e) => {
        if (!e.target) return;
        const id = e.target.id;

        // screen / industrialOffset: วิธีพิมพ์ (printSides) → เปิด/ปิดช่องสีด้านหลัง
        if (id === 'inputPrintSides') {
          this._toggleBackColorsByPrintSides(e.target.value);
        }

        // ขนาดมาตรฐาน → เติมช่องกว้าง/ยาวอัตโนมัติ (แสดงขนาดให้ผู้ใช้เห็น)
        if (id === 'inputStandardSize') {
          this._applyStandardSize(e.target.value);
        }

        if (this.currentSystem !== 'pressSheet') return;
        if (id === 'inputPaperType') {
          this._updatePressSheetGsmOptions(e.target.value);
          this._handlePressSheetMaterialChange(e.target.value);
        }
        // จำนวนหน้า: แสดง/ซ่อนช่องสีด้านหลัง (Req 3.1, 3.2)
        if (id === 'inputSides') {
          this._togglePressSheetBackColors(e.target.value);
        }
        // Trigger Quick Select on relevant field changes (Req 2.1, 3.1, 4.1)
        if (['inputSheetSize', 'inputColorCount', 'inputFrontColors', 'inputBackColors', 'inputSides', 'inputPrintMethod', 'inputPressType', 'inputWidth', 'inputHeight', 'inputPaperType'].includes(id)) {
          this._triggerQuickSelectUpdate();
        }
      });
    }

    // Paper Cutting Optimizer — open/close + factory/mode change + apply (Tasks 8.3)
    const btnOpenOptimizer = document.getElementById('btnOpenOptimizer');
    if (btnOpenOptimizer) {
      btnOpenOptimizer.addEventListener('click', () => {
        const section = document.getElementById('paperCutOptimizerSection');
        if (section) section.classList.remove('hidden');
        // Initial render with default factory (25x36) and default mode (pieces)
        const factoryEl = document.getElementById('optFactorySize');
        const modeEl = document.getElementById('optMode');
        const factoryKey = factoryEl ? factoryEl.value : '25x36';
        const mode = modeEl ? modeEl.value : 'pieces';
        this._renderPaperCutOptimizer(factoryKey, mode);
      });
    }

    const btnCloseOptimizer = document.getElementById('btnCloseOptimizer');
    if (btnCloseOptimizer) {
      btnCloseOptimizer.addEventListener('click', () => {
        const section = document.getElementById('paperCutOptimizerSection');
        if (section) section.classList.add('hidden');
      });
    }

    const optSection = document.getElementById('paperCutOptimizerSection');
    if (optSection) {
      // Factory / mode change → re-render
      optSection.addEventListener('change', (e) => {
        if (e.target && (e.target.id === 'optFactorySize' || e.target.id === 'optMode')) {
          const factoryEl = document.getElementById('optFactorySize');
          const modeEl = document.getElementById('optMode');
          const factoryKey = factoryEl ? factoryEl.value : '25x36';
          const mode = modeEl ? modeEl.value : 'pieces';
          this._renderPaperCutOptimizer(factoryKey, mode);
        }
      });

      // Apply cut button (delegated) — ป้อนค่าเข้าฟอร์ม pressSheet แล้วคำนวณใหม่ทันที (Req 2.1, 2.2, 2.3)
      optSection.addEventListener('click', (e) => {
        if (!e.target || !e.target.classList.contains('btn-apply-cut')) return;
        const factoryKey = e.target.getAttribute('data-factory');
        const press = e.target.getAttribute('data-press');

        // ตั้งค่าเครื่องพิมพ์ + ขนาดกระดาษโรงงาน (factory key) ลงในฟอร์ม
        const inputPressType = document.getElementById('inputPressType');
        if (inputPressType && press) inputPressType.value = press;
        const inputSheetSize = document.getElementById('inputSheetSize');
        if (inputSheetSize && factoryKey) {
          // ตั้งค่าเฉพาะเมื่อ factoryKey เป็น option ที่มีจริงใน dropdown
          const hasOption = Array.from(inputSheetSize.options).some(o => o.value === factoryKey);
          if (hasOption) inputSheetSize.value = factoryKey;
        }

        // ปิด optimizer
        const section = document.getElementById('paperCutOptimizerSection');
        if (section) section.classList.add('hidden');

        // อัปเดต Quick Select + คำนวณราคาใหม่ทันทีด้วยค่าที่เลือก (ไม่มี alert)
        if (typeof this._triggerQuickSelectUpdate === 'function') {
          this._triggerQuickSelectUpdate();
        }
        if (this.currentSystem === 'pressSheet' && this.currentProduct) {
          this.handleSubmit();
        }
      });
    }

    // Restore session state
    this._restoreSession();
  },

  /**
   * Handle system selection — show product types for selected system, clear previous form
   * @param {string} system - System key (screen, digitalOffset, industrialOffset, inkjet)
   */
  selectSystem(system) {
    // If same system already selected, do nothing
    if (this.currentSystem === system) return;

    // Clear previous state
    this.currentProduct = null;
    this.lastResult = null;
    this._hideSection('formSection');
    this._hideSection('resultSection');
    this._hideSection('errorDisplay');
    this._clearFormFields();

    // Update current system
    this.currentSystem = system;

    // Update system card active states
    const cards = document.querySelectorAll('.system-card');
    cards.forEach((card) => {
      const isActive = card.getAttribute('data-system') === system;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Show product selection section
    const productSection = document.getElementById('productSelection');
    if (productSection) {
      productSection.classList.remove('hidden');
    }

    // Render product type buttons
    this._renderProductButtons(system);

    // Save session
    this._saveSession();
  },

  /**
   * Handle product type selection — render input form specific to system + product type
   * @param {string} product - Product type key
   */
  selectProduct(product) {
    // If same product already selected, do nothing
    if (this.currentProduct === product) return;

    // Clear previous form and results
    this.lastResult = null;
    this._hideSection('resultSection');
    this._hideSection('errorDisplay');

    // Update current product
    this.currentProduct = product;

    // Update product button active states
    const buttons = document.querySelectorAll('.product-btn');
    buttons.forEach((btn) => {
      const isActive = btn.getAttribute('data-product') === product;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Render form for this system + product
    this.renderForm(this.currentSystem, product);

    // Save session
    this._saveSession();
  },

  /**
   * Render input form dynamically based on system + product type
   * @param {string} system - Printing system key
   * @param {string} product - Product type key
   */
  renderForm(system, product) {
    const formFields = document.getElementById('formFields');
    const formSection = document.getElementById('formSection');
    if (!formFields || !formSection) return;

    // Clear existing fields
    formFields.innerHTML = '';

    // Paper calculator doesn't use Validator constraints
    if (system === 'paperCalc' || system === 'pressSheet') {
      const fields = this._getFormFields(system, product, {}, null);
      formFields.innerHTML = fields;
      formSection.classList.remove('hidden');
      return;
    }

    // Get constraints for this system/product
    const constraints = Validator.getConstraints(system, product);
    if (!constraints) return;

    // Get price table data for material options
    const productPriceData = this.priceTable && this.priceTable[system]
      ? this.priceTable[system][product]
      : null;

    // Build form fields based on system + product
    const fields = this._getFormFields(system, product, constraints, productPriceData);
    formFields.innerHTML = fields;

    // Show form section
    formSection.classList.remove('hidden');
  },

  /**
   * Debounce timer for quantity change
   */
  _quantityDebounceTimer: null,

  /**
   * Render calculation result — display Quotation Summary with cost breakdown
   * @param {CalculationResult} result - Calculation result from PricingEngine
   */
  renderResult(result) {
    if (!result || !result.success) return;

    const breakdownEl = document.getElementById('resultBreakdown');
    const totalEl = document.getElementById('resultTotal');

    if (!breakdownEl || !totalEl) return;

    // Build cost breakdown HTML
    let breakdownHTML = '';
    if (result.costBreakdown && result.costBreakdown.length > 0) {
      for (const item of result.costBreakdown) {
        // Skip conditional items with zero amount
        if (item.conditional && item.amount <= 0) continue;
        breakdownHTML += `<div class="result-item">
          <span class="result-item-label">${item.label}</span>
          <span class="result-item-amount">${item.unit ? item.amount.toLocaleString('th-TH', {maximumFractionDigits: 2}) + ' ' + item.unit : (item.text ? item.text : PricingEngine.formatCurrency(item.amount))}</span>
        </div>`;
      }
    }
    breakdownEl.innerHTML = breakdownHTML;

    // Build total HTML with unit price
    if (result.system === 'pressSheet') {
      // Press sheet: totalPrice is the combined cost in baht; show summary fields below
      const summary = result.summary || {};
      const totalSheets = (summary.totalSheets !== undefined) ? summary.totalSheets : result.totalPrice;
      const piecesPerSheet = (summary.piecesPerSheet !== undefined) ? summary.piecesPerSheet : result.unitPrice;
      totalEl.innerHTML = `
      <div class="result-total-row">
        <span class="result-total-label">ราคารวมทั้งหมด</span>
        <span class="result-total-amount">${PricingEngine.formatCurrency(result.totalPrice)}</span>
      </div>
      <div class="result-unit-row">
        <span class="result-unit-label">ใบพิมพ์รวม (รวม Spoilage)</span>
        <span class="result-unit-amount">${totalSheets.toLocaleString()} ใบพิมพ์</span>
      </div>
      <div class="result-unit-row">
        <span class="result-unit-label">ชิ้นต่อใบพิมพ์</span>
        <span class="result-unit-amount">${piecesPerSheet.toLocaleString()} ชิ้น/ใบพิมพ์</span>
      </div>`;
    } else {
      totalEl.innerHTML = `
      <div class="result-total-row">
        <span class="result-total-label">ราคารวม</span>
        <span class="result-total-amount">${PricingEngine.formatCurrency(result.totalPrice)}</span>
      </div>
      <div class="result-unit-row">
        <span class="result-unit-label">ราคาต่อหน่วย (${result.quantity.toLocaleString()} ชิ้น)</span>
        <span class="result-unit-amount">${PricingEngine.formatCurrency(result.unitPrice)}</span>
      </div>`;
    }

    // Show result section, hide errors
    this._showSection('resultSection');
    this._hideSection('errorDisplay');
  },

  /**
   * Render validation errors — display all errors simultaneously
   * @param {Array<{field: string, message: string}>} errors - Validation errors
   */
  renderError(errors) {
    const errorDisplay = document.getElementById('errorDisplay');
    const errorList = document.getElementById('errorList');

    if (!errorDisplay || !errorList) return;

    // Build error list HTML
    let errorHTML = '';
    for (const error of errors) {
      errorHTML += `<li>${error.message}</li>`;
    }
    errorList.innerHTML = errorHTML;

    // Show error section, hide results
    this._showSection('errorDisplay');
    this._hideSection('resultSection');
  },

  /**
   * Handle form submission — validate → calculate → display result
   * Collects form data, validates, calculates price, and displays result or errors
   */
  handleSubmit() {
    if (!this.currentSystem) return;

    // กันกรณี currentProduct ยังไม่ถูกตั้งค่า (เช่น ระบบสินค้าเดียวที่ยังไม่ได้ auto-select)
    // ลองเลือกสินค้าตัวแรกให้อัตโนมัติ ถ้ายังไม่ได้ค่อยแจ้งเตือน (ไม่ปล่อยให้เงียบ)
    if (!this.currentProduct) {
      const products = this.PRODUCT_TYPES[this.currentSystem];
      if (products && products.length === 1) {
        this.selectProduct(products[0].key);
      }
      if (!this.currentProduct) {
        this.renderError([{ field: 'form', message: 'กรุณาเลือกประเภทสินค้าก่อนกดคำนวณ' }]);
        return;
      }
    }

    // Collect form data
    const inputData = this._collectFormData();

    // Paper calculator: skip Validator, just check required fields
    if (this.currentSystem === 'paperCalc') {
      if (!inputData.gsm || !inputData.sheetSize || !inputData.quantity) {
        this.renderError([{ field: 'form', message: 'กรุณากรอกข้อมูลให้ครบ (แกรม, ขนาดแผ่น, จำนวน)' }]);
        return;
      }
    } else if (this.currentSystem === 'pressSheet') {
      const missing = [];
      const isSticker = (typeof PricingEngine !== 'undefined' &&
                         typeof PricingEngine._isStickerMaterial === 'function')
        ? PricingEngine._isStickerMaterial(inputData.paperType)
        : false;
      if (!inputData.width || !inputData.height) missing.push('ขนาดชิ้นงาน');
      if (!inputData.sheetSize) missing.push('ขนาดกระดาษ');
      if (!inputData.paperType) missing.push('ชนิดกระดาษ');
      // สติกเกอร์ไม่ใช้แกรม — เช็คแกรมเฉพาะวัสดุกระดาษ
      if (!isSticker && !inputData.gsm) missing.push('แกรม');
      if (!inputData.pressType) missing.push('เครื่องพิมพ์');
      if (!inputData.quantity) missing.push('จำนวนพิมพ์');
      // จำนวนสี: รับ frontColors (ใหม่) หรือ colorCount (legacy)
      if (!inputData.frontColors && !inputData.colorCount) missing.push('จำนวนสีด้านหน้า');
      // งาน 2 หน้าต้องระบุจำนวนสีด้านหลัง (อนุญาต 0)
      if (String(inputData.sides) === '2' &&
          (inputData.backColors === undefined || inputData.backColors === null || inputData.backColors === '')) {
        missing.push('จำนวนสีด้านหลัง');
      }
      if (missing.length > 0) {
        this.renderError([{ field: 'form', message: 'กรุณากรอกข้อมูลให้ครบ (' + missing.join(', ') + ')' }]);
        return;
      }
    } else {
      // Auto-fill width/height from standard size before validation
      if (inputData.standardSize && (!inputData.width || !inputData.height)) {
        const std = this.STANDARD_SIZES[inputData.standardSize];
        if (std) {
          inputData.width = String(std.width);
          inputData.height = String(std.height);
        }
      }

      // Validate
      const validation = Validator.validate(this.currentSystem, this.currentProduct, inputData);
      if (!validation.valid) {
        this.renderError(validation.errors);
        return;
      }
    }

    // Build specs object for PricingEngine
    const specs = this._buildSpecs(inputData);

    // Calculate
    const result = PricingEngine.calculate(this.currentSystem, this.currentProduct, specs, this.priceTable);

    if (!result.success) {
      // Show calculation error
      this.renderError([{ field: 'calculation', message: result.error || 'ไม่สามารถคำนวณราคาได้' }]);
      return;
    }

    // Store last result and specs for printing
    this.lastResult = result;
    this.lastSpecs = specs;

    // Display result
    this.renderResult(result);
  },

  /**
   * Handle quantity change — real-time recalculation (debounced within 1 second)
   * @param {string|number} qty - New quantity value
   */
  handleQuantityChange(qty) {
    // Clear previous debounce timer
    if (this._quantityDebounceTimer) {
      clearTimeout(this._quantityDebounceTimer);
    }

    // Debounce: recalculate within 1 second
    this._quantityDebounceTimer = setTimeout(() => {
      // Only recalculate if we have a previous successful result
      if (!this.lastResult || !this.currentSystem || !this.currentProduct) return;

      // Collect current form data
      const inputData = this._collectFormData();

      // Validate
      const validation = Validator.validate(this.currentSystem, this.currentProduct, inputData);

      if (!validation.valid) {
        // Requirement 11.5: retain previous result if recalculation fails
        return;
      }

      // Build specs and recalculate
      const specs = this._buildSpecs(inputData);
      const result = PricingEngine.calculate(this.currentSystem, this.currentProduct, specs, this.priceTable);

      if (!result.success) {
        // Requirement 11.5: display error but retain previous result
        this.renderError([{ field: 'calculation', message: result.error || 'ไม่สามารถคำนวณราคาได้' }]);
        return;
      }

      // Update stored result and specs
      this.lastResult = result;
      this.lastSpecs = specs;

      // Display updated result
      this.renderResult(result);
    }, 500); // 500ms debounce (well within 1 second requirement)
  },

  /**
   * Handle print button — trigger QuotationPrinter or show error if no calculation done
   */
  handlePrint() {
    if (!this.lastResult || !this.lastResult.success) {
      // Requirement 12.4: show message if no calculation done
      alert('กรุณาคำนวณราคาก่อนพิมพ์ใบเสนอราคา');
      return;
    }

    QuotationPrinter.print(this.lastResult, this.lastSpecs);
  },

  /**
   * Clear all inputs and results
   */
  clearForm() {
    this._clearFormFields();
    this._hideSection('resultSection');
    this._hideSection('errorDisplay');
    this.lastResult = null;
    this.lastSpecs = null;
  },

  // ===== Private helper methods =====

  /**
   * Render product type buttons for the selected system
   * @param {string} system - System key
   */
  _renderProductButtons(system) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    const products = this.PRODUCT_TYPES[system];
    if (!products) return;

    productGrid.innerHTML = products.map((p) =>
      `<button type="button" class="product-btn" data-product="${p.key}" aria-pressed="false">${p.name}</button>`
    ).join('');

    // ระบบที่มีสินค้าเดียว (เช่น คำนวณใบพิมพ์, คำนวณราคากระดาษ) — เลือกให้อัตโนมัติ
    // เพื่อให้ฟอร์มโผล่ทันทีและกดคำนวณได้เลย (กัน currentProduct เป็น null → กดแล้วเงียบ)
    if (products.length === 1) {
      this.selectProduct(products[0].key);
    }
  },

  /**
   * Generate form fields HTML based on system, product, constraints, and price data
   * @param {string} system
   * @param {string} product
   * @param {object} constraints
   * @param {object} productPriceData
   * @returns {string} HTML string
   */
  _getFormFields(system, product, constraints, productPriceData) {
    const fields = [];

    // --- Paper Calculator (special system) ---
    if (system === 'paperCalc') {
      return this._getPaperCalcFields(product);
    }

    // --- Press Sheet Calculator (special system) ---
    if (system === 'pressSheet') {
      return this._getPressSheetFields();
    }

    // --- Size fields ---
    if (constraints.size && constraints.size.fixed) {
      // Fixed size (e.g., business card)
      fields.push(this._renderSizeFixed(system, product, productPriceData));
    } else if (constraints.requiredFields && constraints.requiredFields.includes('depth')) {
      // 3D size (box)
      fields.push(this._renderSize3D(constraints));
    } else {
      // 2D size (width x height)
      fields.push(this._renderSize2D(constraints));
    }

    // --- Standard size selector for brochure/leaflet ---
    if ((product === 'brochure' || product === 'leaflet') && system === 'industrialOffset') {
      fields.push(this._renderStandardSizeSelector(productPriceData));
    }

    // --- Material / Media dropdown ---
    if (system === 'inkjet') {
      fields.push(this._renderMediaDropdown(product, productPriceData));
    } else {
      fields.push(this._renderMaterialDropdown(system, product, productPriceData));
    }

    // --- Color count (for screen and industrial offset) ---
    if (constraints.colorCount) {
      fields.push(this._renderColorCount(constraints));
    }

    // --- Resolution (for inkjet) ---
    if (system === 'inkjet') {
      fields.push(this._renderResolution());
    }

    // --- Page count (for book/catalog) ---
    if (constraints.pageCount) {
      fields.push(this._renderPageCount(constraints));
    }

    // --- Binding type (for book/catalog) ---
    if (constraints.requiredFields && constraints.requiredFields.includes('bindingType')) {
      fields.push(this._renderBindingType(productPriceData));
    }

    // --- Print sides (1 หน้า / 2 หน้า) ---
    fields.push(this._renderPrintSides());

    // --- Quantity ---
    fields.push(this._renderQuantity(constraints));

    // --- Finishing options (checkboxes) ---
    fields.push(this._renderFinishingOptions(system, product, productPriceData));

    return fields.join('');
  },

  /**
   * Render 2D size fields (width x height)
   */
  _renderSize2D(constraints) {
    const min = constraints.size.min;
    const max = constraints.size.max;
    return `
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputWidth">ความกว้าง (ซม.)</label>
          <input type="number" id="inputWidth" name="width" min="${min}" max="${max}" step="0.1" placeholder="${min}–${max}" required>
        </div>
        <div class="form-field">
          <label for="inputHeight">ความยาว (ซม.)</label>
          <input type="number" id="inputHeight" name="height" min="${min}" max="${max}" step="0.1" placeholder="${min}–${max}" required>
        </div>
      </div>`;
  },

  /**
   * Render 3D size fields (width x height x depth)
   */
  _renderSize3D(constraints) {
    const min = constraints.size.min;
    const max = constraints.size.max;
    return `
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputWidth">ความกว้าง (ซม.)</label>
          <input type="number" id="inputWidth" name="width" min="${min}" max="${max}" step="0.1" placeholder="${min}–${max}" required>
        </div>
        <div class="form-field">
          <label for="inputHeight">ความยาว (ซม.)</label>
          <input type="number" id="inputHeight" name="height" min="${min}" max="${max}" step="0.1" placeholder="${min}–${max}" required>
        </div>
        <div class="form-field">
          <label for="inputDepth">ความสูง (ซม.)</label>
          <input type="number" id="inputDepth" name="depth" min="${min}" max="${max}" step="0.1" placeholder="${min}–${max}" required>
        </div>
      </div>`;
  },

  /**
   * Render fixed size selector (for business card)
   */
  _renderSizeFixed(system, product, productPriceData) {
    const sizes = productPriceData && productPriceData.sizes
      ? productPriceData.sizes
      : ['9.0x5.5', '9.0x5.0'];

    const options = sizes.map((s) =>
      `<option value="${s}">${s} ซม.</option>`
    ).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputSize">ขนาด</label>
          <select id="inputSize" name="size" required>
            <option value="">— เลือกขนาด —</option>
            ${options}
          </select>
        </div>
      </div>`;
  },

  /**
   * Render standard size selector for brochure/leaflet
   */
  _renderStandardSizeSelector(productPriceData) {
    // ใช้ตารางกลาง STANDARD_SIZES (มี w×h) เพื่อแสดงขนาดในวงเล็บ + auto-fill
    const order = Object.keys(this.STANDARD_SIZES);

    const options = order.map((key) => {
      const s = this.STANDARD_SIZES[key];
      return `<option value="${key}">${s.label} (${s.width} × ${s.height} ซม.)</option>`;
    }).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputStandardSize">ขนาดมาตรฐาน (ถ้ามี)</label>
          <select id="inputStandardSize" name="standardSize">
            <option value="">— กำหนดเอง —</option>
            ${options}
          </select>
        </div>
      </div>`;
  },

  /**
   * เติมช่องกว้าง/ยาวอัตโนมัติเมื่อเลือกขนาดมาตรฐาน (ให้ผู้ใช้เห็นขนาดบนฟอร์ม)
   * ถ้าเลือก "กำหนดเอง" (ค่าว่าง) จะล้างช่องให้กรอกเอง
   * @param {string} sizeKey - คีย์ใน STANDARD_SIZES
   */
  _applyStandardSize(sizeKey) {
    const widthEl = document.getElementById('inputWidth');
    const heightEl = document.getElementById('inputHeight');
    if (!widthEl || !heightEl) return;
    const s = this.STANDARD_SIZES[sizeKey];
    if (s) {
      widthEl.value = s.width;
      heightEl.value = s.height;
    } else {
      // กำหนดเอง — ล้างช่องให้ผู้ใช้กรอก
      widthEl.value = '';
      heightEl.value = '';
    }
  },

  /**
   * Render material dropdown
   */
  _renderMaterialDropdown(system, product, productPriceData) {
    let materials = {};

    // Get materials from price table
    if (productPriceData) {
      if (productPriceData.materials) {
        materials = productPriceData.materials;
      } else if (productPriceData.paperTypes) {
        // Industrial offset brochure/leaflet/book/catalog use paperTypes
        materials = productPriceData.paperTypes;
      }
    }

    const options = Object.entries(materials).map(([key, mat]) =>
      `<option value="${key}">${mat.name}</option>`
    ).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputMaterial">ประเภทวัสดุ</label>
          <select id="inputMaterial" name="material" required>
            <option value="">— เลือกวัสดุ —</option>
            ${options}
          </select>
        </div>
      </div>`;
  },

  /**
   * Render media dropdown (for inkjet)
   */
  _renderMediaDropdown(product, productPriceData) {
    let media = {};

    if (productPriceData && productPriceData.media) {
      media = productPriceData.media;
    }

    const options = Object.entries(media).map(([key, m]) =>
      `<option value="${key}">${m.name}</option>`
    ).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputMedia">ประเภทวัสดุพิมพ์</label>
          <select id="inputMedia" name="media" required>
            <option value="">— เลือกวัสดุพิมพ์ —</option>
            ${options}
          </select>
        </div>
      </div>`;
  },

  /**
   * Render color count input
   */
  _renderColorCount(constraints) {
    const min = constraints.colorCount.min;
    const max = constraints.colorCount.max;
    return `
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputColorCount">สีด้านหน้า (จำนวนสี)</label>
          <input type="number" id="inputColorCount" name="colorCount" min="${min}" max="${max}" step="1" value="4" placeholder="เช่น 4 = CMYK" required>
        </div>
        <div class="form-field" id="backColorsField">
          <label for="inputBackColors">สีด้านหลัง (จำนวนสี)</label>
          <input type="number" id="inputBackColors" name="backColors" min="0" max="${max}" step="1" value="0" placeholder="0 = ไม่พิมพ์หลัง">
        </div>
      </div>`;
  },

  /**
   * Render resolution selector (for inkjet)
   */
  _renderResolution() {
    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputResolution">ความละเอียด</label>
          <select id="inputResolution" name="resolution" required>
            <option value="">— เลือกความละเอียด —</option>
            <option value="720dpi">720 dpi</option>
            <option value="1440dpi">1440 dpi</option>
          </select>
        </div>
      </div>`;
  },

  /**
   * Render page count input (for book/catalog)
   */
  _renderPageCount(constraints) {
    const min = constraints.pageCount.min;
    const max = constraints.pageCount.max;
    const divisibleBy = constraints.pageCount.divisibleBy;
    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputPageCount">จำนวนหน้า (ต้องหารด้วย ${divisibleBy} ลงตัว)</label>
          <input type="number" id="inputPageCount" name="pageCount" min="${min}" max="${max}" step="${divisibleBy}" placeholder="${min}–${max} หน้า" required>
        </div>
      </div>`;
  },

  /**
   * Render binding type dropdown (for book/catalog)
   */
  _renderBindingType(productPriceData) {
    let bindingTypes = {};

    if (productPriceData && productPriceData.bindingTypes) {
      bindingTypes = productPriceData.bindingTypes;
    }

    const options = Object.entries(bindingTypes).map(([key, bt]) =>
      `<option value="${key}">${bt.name}</option>`
    ).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputBindingType">ประเภทเข้าเล่ม</label>
          <select id="inputBindingType" name="bindingType" required>
            <option value="">— เลือกประเภทเข้าเล่ม —</option>
            ${options}
          </select>
        </div>
      </div>`;
  },

  /**
   * Render quantity input
   */
  _renderQuantity(constraints) {
    const min = constraints.quantity.min;
    const max = constraints.quantity.max;
    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputQuantity">จำนวน (ชิ้น)</label>
          <input type="number" id="inputQuantity" name="quantity" min="${min}" max="${max}" step="1" placeholder="${min.toLocaleString()}–${max.toLocaleString()}" required>
        </div>
      </div>`;
  },

  /**
   * Render paper calculator form fields
   */
  _getPaperCalcFields(paperType) {
    // GSM options based on paper type
    const gsmOptions = {
      woodfree: [60, 70, 80, 100, 120],
      artPaper: [80, 85, 90, 100, 105, 113, 120, 128, 157],
      artBoard: [190, 210, 230, 260, 300, 310, 350, 360, 400, 420],
      ivoryBoard: [190, 210, 215, 230, 235, 250, 270, 280, 295, 300, 330, 350, 380],
      greyBack: [250, 270, 300, 350, 400, 450],
      kraft: [50, 60, 75, 117, 140, 170],
      cardWhite: [150, 180, 210, 230, 250],
    };

    const gsms = gsmOptions[paperType] || [80];
    const gsmOpts = gsms.map(g => `<option value="${g}">${g} แกรม</option>`).join('');

    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputGsm">แกรมกระดาษ</label>
          <select id="inputGsm" name="gsm" required>
            <option value="">— เลือกแกรม —</option>
            ${gsmOpts}
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputSheetSize">ขนาดแผ่น</label>
          <select id="inputSheetSize" name="sheetSize" required>
            <option value="31x43">31 × 43 นิ้ว (78.74 × 109.22 ซม.) — B1</option>
            <option value="25x36">25 × 36 นิ้ว (63.50 × 91.44 ซม.)</option>
            <option value="24x35">24 × 35 นิ้ว (60.96 × 88.90 ซม.) — เหมาะ A4</option>
          </select>
        </div>
      </div>
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputQuantity">จำนวน</label>
          <input type="number" id="inputQuantity" name="quantity" min="1" step="1" placeholder="จำนวน" required>
        </div>
        <div class="form-field">
          <label for="inputQuantityUnit">หน่วย</label>
          <select id="inputQuantityUnit" name="quantityUnit" required>
            <option value="ream">รีม (500 แผ่น)</option>
            <option value="sheet">แผ่น</option>
            <option value="kg">กิโลกรัม</option>
          </select>
        </div>
      </div>`;
  },

  /**
   * GSM options per paper type — used by pressSheet form
   */
  PRESS_SHEET_GSM_OPTIONS: {
    woodfree:   [60, 70, 80, 100, 120],
    artPaper:   [80, 85, 90, 100, 105, 113, 120, 128, 157],
    artBoard:   [190, 210, 230, 260, 300, 310, 350, 360, 400, 420],
    ivoryBoard: [190, 210, 230, 250, 270, 300, 350],
    greyBack:   [250, 270, 300, 350, 400, 450],
    kraft:      [50, 60, 75, 117, 140, 170],
    cardWhite:  [150, 180, 210, 230, 250],
  },

  /**
   * Paper type labels for pressSheet form
   */
  PRESS_SHEET_PAPER_TYPES: [
    { key: 'woodfree',   name: 'ปอนด์ (Woodfree)' },
    { key: 'artPaper',   name: 'อาร์ตมัน/ด้าน (Art Paper)' },
    { key: 'artBoard',   name: 'อาร์ตการ์ด 2 หน้า (Art Board)' },
    { key: 'ivoryBoard', name: 'อาร์ตการ์ด 1 หน้า (ไอวอรี่)' },
    { key: 'greyBack',   name: 'กล่องแป้งหลังเทา' },
    { key: 'kraft',      name: 'คราฟท์' },
    { key: 'cardWhite',  name: 'กระดาษการ์ดขาว' },
    { key: 'pvcSticker',   name: 'สติกเกอร์ PVC (หมึก UV)' },
    { key: 'ppSticker',    name: 'สติกเกอร์ PP (หมึก UV)' },
    { key: 'petSticker',   name: 'สติกเกอร์ PET (หมึก UV)' },
    { key: 'paperSticker', name: 'สติกเกอร์กระดาษ (หมึกคอนเวนชั่นนัล)' },
  ],

  /**
   * Render press sheet calculator form fields (ระบบคำนวณใบพิมพ์)
   */
  _getPressSheetFields() {
    const paperTypeOpts = this.PRESS_SHEET_PAPER_TYPES.map(p =>
      `<option value="${p.key}">${p.name}</option>`
    ).join('');

    // Build press machine options sorted by plateSize (Req 1.8)
    // ตัด 8 → ตัด 4 → ตัด 2 → ตัด 1 (smallest plate to largest)
    const PLATE_ORDER = { 'ตัด 8': 0, 'ตัด 4': 1, 'ตัด 2': 2, 'ตัด 1': 3 };
    const getPlateOrder = (plateSize) => {
      if (typeof plateSize !== 'string') return 99;
      const match = plateSize.match(/ตัด\s*\d+/);
      if (!match) return 99;
      const key = match[0].replace(/\s+/, ' ');
      return PLATE_ORDER[key] !== undefined ? PLATE_ORDER[key] : 99;
    };
    let pressMachineOpts = '';
    if (typeof PricingEngine !== 'undefined' && PricingEngine.MACHINE_SPECS) {
      const pressEntries = Object.entries(PricingEngine.MACHINE_SPECS)
        .sort(([, a], [, b]) => getPlateOrder(a.plateSize) - getPlateOrder(b.plateSize));
      pressMachineOpts = pressEntries.map(([key, spec]) =>
        `<option value="${key}">${spec.name} (${spec.plateSize}, รับ ${spec.maxWidth}×${spec.maxHeight} ซม., เพลท ${spec.plateCostPerColor} บาท/สี)</option>`
      ).join('');
    }

    return `
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputWidth">กว้างชิ้นงาน (ซม.)</label>
          <input type="number" id="inputWidth" name="width" min="1" max="100" step="0.1" placeholder="กว้าง ซม." required>
        </div>
        <div class="form-field">
          <label for="inputHeight">ยาวชิ้นงาน (ซม.)</label>
          <input type="number" id="inputHeight" name="height" min="1" max="100" step="0.1" placeholder="ยาว ซม." required>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputSheetSize">ขนาดกระดาษ</label>
          <select id="inputSheetSize" name="sheetSize" required>
            <option value="31x43">31 × 43 นิ้ว (78.74×109.22 ซม.)</option>
            <option value="25x36">25 × 36 นิ้ว (63.50×91.44 ซม.)</option>
            <option value="24x35">24 × 35 นิ้ว (60.96×88.90 ซม.)</option>
            <option value="19x25">19 × 25 นิ้ว (48.26×63.50 ซม.)</option>
          </select>
        </div>
      </div>
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputPaperType">ชนิดกระดาษ</label>
          <select id="inputPaperType" name="paperType" required>
            <option value="">— เลือกชนิดกระดาษ —</option>
            ${paperTypeOpts}
          </select>
        </div>
        <div class="form-field" id="gsmField">
          <label for="inputGsm">แกรม</label>
          <select id="inputGsm" name="gsm" required disabled>
            <option value="">— เลือกชนิดกระดาษก่อน —</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputPressType">เครื่องพิมพ์</label>
          <select id="inputPressType" name="pressType" required>
            <option value="">— เลือกเครื่องพิมพ์ —</option>
            ${pressMachineOpts}
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputQuantity">จำนวนพิมพ์ (ชิ้น)</label>
          <input type="number" id="inputQuantity" name="quantity" min="1" step="1" placeholder="จำนวนชิ้นที่ต้องการ" required>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputSides">จำนวนหน้าที่พิมพ์</label>
          <select id="inputSides" name="sides" required>
            <option value="1" selected>พิมพ์หน้าเดียว (1 หน้า)</option>
            <option value="2">พิมพ์สองหน้า (หน้า–หลัง)</option>
          </select>
        </div>
      </div>
      <div class="form-group form-group-row">
        <div class="form-field">
          <label for="inputFrontColors">สีด้านหน้า (จำนวนสี 1–6)</label>
          <input type="number" id="inputFrontColors" name="frontColors" min="1" max="6" step="1" value="4" placeholder="เช่น 4 = CMYK" required>
        </div>
        <div class="form-field" id="backColorsField">
          <label for="inputBackColors">สีด้านหลัง (จำนวนสี 0–6)</label>
          <input type="number" id="inputBackColors" name="backColors" min="0" max="6" step="1" value="0" placeholder="0 = ไม่พิมพ์หลัง">
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputJobType">ประเภทงาน (สำหรับคำนวณ Spoilage)</label>
          <select id="inputJobType" name="jobType" required>
            <option value="oneColorRepeat">1 สี ซ้ำ (Spoilage 3%, ขั้นต่ำ 50)</option>
            <option value="twoColorGeneral" selected>2 สี ทั่วไป (Spoilage 5%, ขั้นต่ำ 100)</option>
            <option value="fourColorRepeat">4 สี ซ้ำ (Spoilage 8%, ขั้นต่ำ 100)</option>
            <option value="fourColorFirst">4 สี ครั้งแรก (Spoilage 10%, ขั้นต่ำ 150)</option>
            <option value="uvOrPantone">UV / Pantone (Spoilage 10%, ขั้นต่ำ 100)</option>
            <option value="specialPaper">กระดาษพิเศษ (Spoilage 15%, ขั้นต่ำ 150)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputInkType">ประเภทหมึก</label>
          <select id="inputInkType" name="inkType" required>
            <option value="conventional" selected>คอนเวนชั่นนัล</option>
            <option value="uv">UV (สำหรับงานพิมพ์พลาสติก)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label for="inputPrintMethod">วิธีพิมพ์</label>
          <select id="inputPrintMethod" name="printMethod" required>
            <option value="single">พิมพ์ 1 หน้า</option>
            <option value="sheetwise">Sheetwise (พิมพ์ 2 รอบ, เพลท 2 ชุด)</option>
            <option value="work-and-turn">Work-and-Turn (พิมพ์ 2 ด้าน, เพลท 1 ชุด)</option>
            <option value="work-and-tumble">Work-and-Tumble (พิมพ์ 2 ด้าน, เพลท 1 ชุด)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <details class="advanced-options">
          <summary style="cursor:pointer; padding: 0.5rem 0; font-weight: 500; color: #666;">⚙️ ตัวเลือกขั้นสูง (Advanced)</summary>
          <div class="form-group form-group-row" style="margin-top:0.5rem;">
            <div class="form-field">
              <label for="inputGripper">Gripper Margin (มม.) — ปกติ 12</label>
              <input type="number" id="inputGripper" name="gripperOverride" min="10" max="15" step="0.1" placeholder="10–15">
            </div>
            <div class="form-field">
              <label for="inputSideLay">Side Lay (มม.) — ปกติ 7</label>
              <input type="number" id="inputSideLay" name="sideLayOverride" min="5" max="10" step="0.1" placeholder="5–10">
            </div>
          </div>
        </details>
      </div>
      <div id="quickSelectPanel" class="quick-select-panel" style="margin-top: 1rem;"></div>`;
  },

  /**
   * Update GSM dropdown when paper type changes (pressSheet form)
   */
  _updatePressSheetGsmOptions(paperType) {
    const gsmEl = document.getElementById('inputGsm');
    if (!gsmEl) return;

    const gsms = this.PRESS_SHEET_GSM_OPTIONS[paperType];
    if (!gsms || gsms.length === 0) {
      gsmEl.innerHTML = '<option value="">— เลือกชนิดกระดาษก่อน —</option>';
      gsmEl.disabled = true;
      return;
    }

    const opts = gsms.map(g => `<option value="${g}">${g} แกรม</option>`).join('');
    gsmEl.innerHTML = '<option value="">— เลือกแกรม —</option>' + opts;
    gsmEl.disabled = false;
  },

  /**
   * เปิด/ปิดช่อง "สีด้านหลัง" ตามจำนวนหน้า (Req 3.1, 3.2)
   * ช่องแสดงตลอด แต่ disable เมื่อพิมพ์หน้าเดียว เพื่อให้ผู้ใช้เห็นว่ามีช่องนี้
   * @param {string|number} sides - '1' | '2'
   */
  _togglePressSheetBackColors(sides) {
    const backEl = document.getElementById('inputBackColors');
    if (!backEl) return;
    const isTwoSided = String(sides) === '2';
    if (isTwoSided) {
      if (!backEl.value || backEl.value === '0') backEl.value = '4';
    } else {
      backEl.value = '0';
    }
  },

  /**
   * เปิด/ปิดช่อง "สีด้านหลัง" ตามวิธีพิมพ์ (screen / industrialOffset)
   * printSides: '1' = หน้าเดียว (ปิด), '2'/'work-and-turn'/'work-and-tumble' = 2 หน้า (เปิด)
   * @param {string} printSides
   */
  _toggleBackColorsByPrintSides(printSides) {
    const backEl = document.getElementById('inputBackColors');
    if (!backEl) return;
    const isTwoSided = (String(printSides) !== '1');
    if (isTwoSided) {
      if (!backEl.value || backEl.value === '0') backEl.value = '4';
    } else {
      backEl.value = '0';
    }
  },

  /**
   * เมื่อผู้ใช้กรอกสีด้านหลัง > 0 ให้สลับ "วิธีพิมพ์/จำนวนหน้า" เป็น 2 หน้าอัตโนมัติ
   * ทำงานกับทั้ง inputPrintSides (screen/industrial) และ inputSides (pressSheet)
   */
  _syncSidesFromBackColors() {
    const backEl = document.getElementById('inputBackColors');
    if (!backEl) return;
    const back = Number(backEl.value) || 0;
    // screen / industrialOffset: inputPrintSides
    const printSidesEl = document.getElementById('inputPrintSides');
    if (printSidesEl) {
      if (back > 0 && printSidesEl.value === '1') {
        printSidesEl.value = '2';  // Sheetwise (พิมพ์ 2 หน้า)
      } else if (back === 0 && printSidesEl.value !== '1') {
        printSidesEl.value = '1';
      }
    }
    // pressSheet: inputSides (+ printMethod)
    const sidesEl = document.getElementById('inputSides');
    if (sidesEl) {
      if (back > 0 && sidesEl.value === '1') {
        sidesEl.value = '2';
        const pm = document.getElementById('inputPrintMethod');
        if (pm && pm.value === 'single') pm.value = 'sheetwise';
      } else if (back === 0 && sidesEl.value === '2') {
        sidesEl.value = '1';
      }
    }
  },

  /**
   * เมื่อเปลี่ยนชนิดวัสดุ — ถ้าเป็นสติกเกอร์: ซ่อนช่องแกรม + ตั้งหมึก UV (ยังแก้ได้)
   * ถ้าเป็นกระดาษ: แสดงช่องแกรม + ตั้งหมึกคอนเวนชั่นนัล (Req 4.2, 4.3, 4.5, 4.6)
   * @param {string} materialKey
   */
  _handlePressSheetMaterialChange(materialKey) {
    const isSticker = (typeof PricingEngine !== 'undefined' &&
                       typeof PricingEngine._isStickerMaterial === 'function')
      ? PricingEngine._isStickerMaterial(materialKey)
      : false;
    const gsmField = document.getElementById('gsmField');
    const gsmEl = document.getElementById('inputGsm');
    const inkEl = document.getElementById('inputInkType');
    if (gsmField) gsmField.style.display = isSticker ? 'none' : '';
    if (gsmEl) {
      // สติกเกอร์ไม่ใช้แกรม — ปลด required เพื่อไม่บล็อกการคำนวณ
      gsmEl.required = !isSticker;
      if (isSticker) gsmEl.value = '';
    }
    if (inkEl) {
      // ใช้ค่า default ตามวัสดุ (สติกเกอร์กระดาษ = คอนเวนชั่นนัล, พลาสติก = UV)
      let defaultInk = 'conventional';
      if (isSticker && typeof PricingEngine !== 'undefined' && PricingEngine.MATERIAL_INK_DEFAULT) {
        defaultInk = PricingEngine.MATERIAL_INK_DEFAULT[materialKey] || 'uv';
      }
      inkEl.value = defaultInk;
    }
  },

  /**
   * Render Quick Select panel ใต้ฟอร์ม pressSheet
   * เรียกเมื่อ user เปลี่ยน sheetSize, quantity, colorCount, printMethod, pressType
   * @param {object} specs - { sheetSize, quantity, colorCount, printMethod, pieceSize, currentPress }
   */
  _renderQuickSelect(specs) {
    const panel = document.getElementById('quickSelectPanel');
    if (!panel) return;
    if (typeof PricingEngine === 'undefined' || !PricingEngine.QuickSelect) return;

    const QS = PricingEngine.QuickSelect;
    const SHEET_DIMS = {
      '31x43': { width: 78.74, height: 109.22, name: '31×43 นิ้ว' },
      '25x36': { width: 63.50, height: 91.44,  name: '25×36 นิ้ว' },
      '24x35': { width: 60.96, height: 88.90,  name: '24×35 นิ้ว' },
    };
    const sheetDim = specs.sheetSize ? SHEET_DIMS[specs.sheetSize] : null;
    if (!sheetDim) {
      panel.innerHTML = '';
      return;
    }

    const bySize  = QS.recommendByPaperSize(sheetDim);
    const byColor = (specs.colorCount && specs.colorCount > 0)
      ? QS.recommendByColorCount(specs.colorCount, specs.printMethod)
      : bySize;
    const intersection = QS.intersectRecommendations(bySize, byColor);
    const methodRec = (specs.quantity && specs.quantity > 0) ? QS.recommendByQuantity(specs.quantity) : null;
    const a4Warning = QS.checkA4Warning(specs.sheetSize, specs.pieceSize || { width: 0, height: 0 });

    const lookupName = (key) => {
      const spec = PricingEngine.MACHINE_SPECS[key];
      return spec ? spec.name : key;
    };

    let html = '';

    // A4 warning (Req 2.10)
    if (a4Warning) {
      html += `<div class="qs-warning" style="background:#fff3cd; border:1px solid #ffc107; padding:0.6rem 0.8rem; border-radius:4px; margin-bottom:0.5rem;">${a4Warning}</div>`;
    }

    // Recommended machines (Req 2.1, 4.5)
    if (intersection.length > 0) {
      const names = intersection.map(lookupName).join(', ');
      html += `<div class="qs-recommend" style="background:#d1ecf1; border:1px solid #0c5460; padding:0.6rem 0.8rem; border-radius:4px; margin-bottom:0.5rem;"><strong>💡 เครื่องที่แนะนำ:</strong> ${names}</div>`;
    } else if (bySize.length > 0) {
      // Fallback ใช้ bySize เพียงอย่างเดียวถ้า intersection ว่าง
      const names = bySize.map(lookupName).join(', ');
      html += `<div class="qs-recommend" style="background:#d1ecf1; border:1px solid #0c5460; padding:0.6rem 0.8rem; border-radius:4px; margin-bottom:0.5rem;"><strong>💡 เครื่องที่รับขนาดกระดาษนี้ได้:</strong> ${names}</div>`;
    }

    // Recommended print method (Req 3.1–3.5)
    if (methodRec && methodRec.primary) {
      const methodLabels = {
        'work-and-turn': 'Work-and-Turn',
        'sheetwise':     'Sheetwise',
      };
      const primaryLabel = methodLabels[methodRec.primary] || methodRec.primary;
      html += `<div class="qs-method" style="background:#d4edda; border:1px solid #28a745; padding:0.6rem 0.8rem; border-radius:4px; margin-bottom:0.5rem;"><strong>⚙️ วิธีพิมพ์ที่แนะนำ:</strong> ${primaryLabel} — ${methodRec.reason}</div>`;
    }

    // Warning if user picked a press not in recommended list (Req 2.9)
    if (specs.currentPress && bySize.length > 0 && !bySize.includes(specs.currentPress)) {
      html += `<div class="qs-warning" style="background:#f8d7da; border:1px solid #dc3545; padding:0.6rem 0.8rem; border-radius:4px; margin-bottom:0.5rem;">⚠️ เครื่องที่เลือก (${lookupName(specs.currentPress)}) อาจรับกระดาษ ${sheetDim.name} ไม่ได้ — ตรวจสอบขนาดอีกครั้ง</div>`;
    }

    panel.innerHTML = html;
  },

  /**
   * Trigger Quick Select update — collect current form values and re-render panel
   */
  _triggerQuickSelectUpdate() {
    if (this.currentSystem !== 'pressSheet') return;
    const get = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };
    const specs = {
      sheetSize: get('inputSheetSize'),
      quantity: Number(get('inputQuantity')) || 0,
      colorCount: Number(get('inputColorCount')) || 0,
      printMethod: get('inputPrintMethod'),
      currentPress: get('inputPressType'),
      pieceSize: {
        width: Number(get('inputWidth')) || 0,
        height: Number(get('inputHeight')) || 0,
      },
    };
    this._renderQuickSelect(specs);
  },

  /**
   * Debounced Quick Select update (300ms)
   */
  _debounceQuickSelectUpdate() {
    if (this._qsDebounceTimer) clearTimeout(this._qsDebounceTimer);
    this._qsDebounceTimer = setTimeout(() => {
      this._triggerQuickSelectUpdate();
    }, 300);
  },

  /**
   * Render Paper Cutting Optimizer table — Tasks 8.2
   * Req 9.4, 9.5, 7.4
   * @param {string} factoryKey - '31x43' | '25x36' | '24x35' | '19x25'
   * @param {'pieces'|'waste'} optimizeFor
   */
  _renderPaperCutOptimizer(factoryKey, optimizeFor) {
    const container = document.getElementById('paperCutOptimizerResults');
    if (!container) return;
    if (typeof PricingEngine === 'undefined' || !PricingEngine.PaperCuttingOptimizer) {
      container.innerHTML = '<div class="qs-warning">ไม่พบโมดูล Paper Cutting Optimizer</div>';
      return;
    }

    const result = PricingEngine.PaperCuttingOptimizer.optimize(factoryKey, [], optimizeFor);
    if (!result.success) {
      container.innerHTML = '<div class="qs-warning" style="background:#f8d7da;padding:0.6rem;border-radius:4px;">' + (result.error || 'ไม่สามารถคำนวณการตัดกระดาษได้') + '</div>';
      return;
    }

    const { factory, results } = result;
    const lookupName = function(key) {
      const m = PricingEngine.MACHINE_SPECS[key];
      return m ? m.name : key;
    };

    const hasAnyCompatible = results.some(function(r) { return r.compatibleMachines && r.compatibleMachines.length > 0; });

    let html = '';
    html += '<p style="margin:0 0 0.5rem;color:#555;"><strong>กระดาษโรงงาน:</strong> ' + factory.label +
            ' (' + factory.width.toFixed(1) + '×' + factory.height.toFixed(1) + ' ซม.)' +
            ' &nbsp; <strong>พื้นที่:</strong> ' + (factory.width * factory.height).toFixed(0) + ' ตร.ซม.</p>';

    if (!hasAnyCompatible) {
      html += '<div class="qs-warning" style="background:#f8d7da;padding:0.6rem;border-radius:4px;margin-bottom:0.5rem;">⚠️ ไม่มีตัดที่เข้าเครื่องที่เลือก</div>';
    }

    // Table
    html += '<table class="opt-table" style="width:100%;border-collapse:collapse;font-size:0.95em;">';
    html += '<thead><tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">';
    html += '<th style="padding:0.5rem;text-align:center;">แนะนำ</th>';
    html += '<th style="padding:0.5rem;text-align:center;">แถว × คอลัมน์</th>';
    html += '<th style="padding:0.5rem;text-align:center;">ชิ้น/ใบ</th>';
    html += '<th style="padding:0.5rem;text-align:center;">ขนาดชิ้น (ซม.)</th>';
    html += '<th style="padding:0.5rem;text-align:right;">เศษเสีย (ตร.ซม.)</th>';
    html += '<th style="padding:0.5rem;text-align:left;">เครื่องที่เข้าได้</th>';
    html += '<th style="padding:0.5rem;text-align:center;">ใช้</th>';
    html += '</tr></thead><tbody>';

    for (const r of results) {
      const rowStyle = r.recommended ? 'background:#d4edda;font-weight:500;' : '';
      const noCompat = r.compatibleMachines.length === 0;
      const compatStr = noCompat
        ? '<span style="color:#999;">— ไม่มี —</span>'
        : r.compatibleMachines.map(lookupName).join(', ');
      const applyBtn = noCompat
        ? '<span style="color:#999;">—</span>'
        : '<button type="button" class="btn-apply-cut" data-rows="' + r.rows + '" data-cols="' + r.cols +
          '" data-cut-w="' + r.cutWidth.toFixed(2) + '" data-cut-h="' + r.cutHeight.toFixed(2) +
          '" data-factory="' + factoryKey + '" data-press="' + r.compatibleMachines[0] + '" style="padding:0.3rem 0.6rem;background:#28a745;color:#fff;border:none;border-radius:3px;cursor:pointer;">เลือก</button>';
      const recommendedBadge = r.recommended
        ? '<span style="background:#ffc107;padding:0.2rem 0.5rem;border-radius:3px;font-weight:bold;">⭐ แนะนำ</span>'
        : '';

      html += '<tr style="' + rowStyle + 'border-bottom:1px solid #eee;">';
      html += '<td style="padding:0.5rem;text-align:center;">' + recommendedBadge + '</td>';
      html += '<td style="padding:0.5rem;text-align:center;">' + r.rows + ' × ' + r.cols + '</td>';
      html += '<td style="padding:0.5rem;text-align:center;">' + r.cutsPerSheet + '</td>';
      html += '<td style="padding:0.5rem;text-align:center;">' + r.cutWidth.toFixed(1) + ' × ' + r.cutHeight.toFixed(1) + '</td>';
      html += '<td style="padding:0.5rem;text-align:right;">' + r.wasteCm2.toFixed(1) + '</td>';
      html += '<td style="padding:0.5rem;text-align:left;font-size:0.9em;">' + compatStr + '</td>';
      html += '<td style="padding:0.5rem;text-align:center;">' + applyBtn + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table>';

    container.innerHTML = html;
  },

  /**
   * Render print sides selector (วิธีพิมพ์: 1 หน้า / 2 หน้า Sheetwise / หน้าในตัว)
   */
  _renderPrintSides() {
    return `
      <div class="form-group">
        <div class="form-field">
          <label for="inputPrintSides">วิธีพิมพ์</label>
          <select id="inputPrintSides" name="printSides" required>
            <option value="1">พิมพ์ 1 หน้า (หน้าเดียว)</option>
            <option value="2">พิมพ์ 2 หน้า — Sheetwise (แยกเพลท 2 ชุด)</option>
            <option value="work-and-turn">พิมพ์ 2 หน้า — หน้าในตัว Work-and-Turn (เพลท 1 ชุด)</option>
            <option value="work-and-tumble">พิมพ์ 2 หน้า — กลับคิปเปอร์ Work-and-Tumble (เพลท 1 ชุด)</option>
          </select>
        </div>
      </div>`;
  },

  /**
   * Render finishing options as checkboxes
   */
  _renderFinishingOptions(system, product, productPriceData) {
    let finishing = {};

    if (productPriceData && productPriceData.finishing) {
      finishing = productPriceData.finishing;
    }

    // If no finishing options available, don't render
    if (Object.keys(finishing).length === 0) return '';

    const checkboxes = Object.entries(finishing).map(([key, opt]) =>
      `<label class="checkbox-label">
        <input type="checkbox" name="finishing" value="${key}">
        <span>${opt.name}</span>
      </label>`
    ).join('');

    return `
      <div class="form-group">
        <fieldset class="form-fieldset">
          <legend>ตัวเลือกตกแต่งเพิ่มเติม</legend>
          <div class="checkbox-group">
            ${checkboxes}
          </div>
        </fieldset>
      </div>`;
  },

  // ===== Form data collection helpers =====

  /**
   * Collect form data from the current form into an object
   * @returns {object} Form data object
   */
  _collectFormData() {
    const data = {};

    // Size fields
    const widthEl = document.getElementById('inputWidth');
    const heightEl = document.getElementById('inputHeight');
    const depthEl = document.getElementById('inputDepth');
    const sizeEl = document.getElementById('inputSize');
    const standardSizeEl = document.getElementById('inputStandardSize');

    if (widthEl) data.width = widthEl.value;
    if (heightEl) data.height = heightEl.value;
    if (depthEl) data.depth = depthEl.value;
    if (sizeEl) data.size = sizeEl.value;
    if (standardSizeEl) data.standardSize = standardSizeEl.value;

    // Material / Media
    const materialEl = document.getElementById('inputMaterial');
    const mediaEl = document.getElementById('inputMedia');
    if (materialEl) data.material = materialEl.value;
    if (mediaEl) data.media = mediaEl.value;

    // Color count
    const colorCountEl = document.getElementById('inputColorCount');
    if (colorCountEl) data.colorCount = colorCountEl.value;

    // Resolution (inkjet)
    const resolutionEl = document.getElementById('inputResolution');
    if (resolutionEl) data.resolution = resolutionEl.value;

    // Page count (book/catalog)
    const pageCountEl = document.getElementById('inputPageCount');
    if (pageCountEl) data.pageCount = pageCountEl.value;

    // Binding type (book/catalog)
    const bindingTypeEl = document.getElementById('inputBindingType');
    if (bindingTypeEl) data.bindingType = bindingTypeEl.value;

    // Quantity
    const quantityEl = document.getElementById('inputQuantity');
    if (quantityEl) data.quantity = quantityEl.value;

    // Print sides (1 or 2)
    const printSidesEl = document.getElementById('inputPrintSides');
    if (printSidesEl) data.printSides = printSidesEl.value;

    // Paper calculator fields
    const gsmEl = document.getElementById('inputGsm');
    if (gsmEl) data.gsm = gsmEl.value;
    const sheetSizeEl = document.getElementById('inputSheetSize');
    if (sheetSizeEl) data.sheetSize = sheetSizeEl.value;
    const quantityUnitEl = document.getElementById('inputQuantityUnit');
    if (quantityUnitEl) data.quantityUnit = quantityUnitEl.value;

    // Press sheet calculator fields
    const jobTypeEl = document.getElementById('inputJobType');
    if (jobTypeEl) data.jobType = jobTypeEl.value;
    const printMethodEl = document.getElementById('inputPrintMethod');
    if (printMethodEl) data.printMethod = printMethodEl.value;
    const paperTypeEl = document.getElementById('inputPaperType');
    if (paperTypeEl) data.paperType = paperTypeEl.value;
    const pressTypeEl = document.getElementById('inputPressType');
    if (pressTypeEl) data.pressType = pressTypeEl.value;

    // pressSheet: inkType + advanced overrides (gripper / side lay in mm)
    const inkTypeEl = document.getElementById('inputInkType');
    if (inkTypeEl) data.inkType = inkTypeEl.value;
    const gripperEl = document.getElementById('inputGripper');
    if (gripperEl) data.gripperOverride = gripperEl.value;
    const sideLayEl = document.getElementById('inputSideLay');
    if (sideLayEl) data.sideLayOverride = sideLayEl.value;

    // pressSheet: จำนวนหน้า + สีต่อด้าน (Req 3.1, 3.2)
    const sidesEl = document.getElementById('inputSides');
    if (sidesEl) data.sides = sidesEl.value;
    const frontColorsEl = document.getElementById('inputFrontColors');
    if (frontColorsEl) data.frontColors = frontColorsEl.value;
    const backColorsEl = document.getElementById('inputBackColors');
    if (backColorsEl) data.backColors = backColorsEl.value;

    // Finishing options (checkboxes)
    const finishingCheckboxes = document.querySelectorAll('input[name="finishing"]:checked');
    data.finishing = Array.from(finishingCheckboxes).map((cb) => cb.value);

    return data;
  },

  /**
   * Build specs object for PricingEngine from collected form data
   * @param {object} inputData - Collected form data
   * @returns {object} Specs object matching PricingEngine interface
   */
  _buildSpecs(inputData) {
    const specs = {};

    // Build size object
    specs.size = {};
    if (inputData.width) specs.size.width = Number(inputData.width);
    if (inputData.height) specs.size.height = Number(inputData.height);
    if (inputData.depth) specs.size.depth = Number(inputData.depth);

    // Standard size auto-fill — ถ้าเลือกขนาดมาตรฐานแล้วไม่ได้กรอก width/height
    if (inputData.standardSize && (!specs.size.width || !specs.size.height)) {
      const std = this.STANDARD_SIZES[inputData.standardSize];
      if (std) {
        specs.size.width = std.width;
        specs.size.height = std.height;
      }
    }

    // For business card with fixed size, parse the size string (e.g., "9.0x5.5")
    if (inputData.size && this.currentProduct === 'businessCard') {
      const parts = inputData.size.split('x');
      if (parts.length === 2) {
        specs.size.width = parseFloat(parts[0]);
        specs.size.height = parseFloat(parts[1]);
      }
    }

    // Material or media
    if (inputData.material) specs.material = inputData.material;
    if (inputData.media) specs.media = inputData.media;

    // Color count — รองรับสีด้านหน้า/ด้านหลัง (screen / industrialOffset)
    // engine คิด plateCost/printCost = colorCount × อัตรา จึงรวมสีหน้า+หลังเป็น colorCount
    // และตั้ง printMethod ไม่ให้คูณซ้ำ (per-side รวมเองแล้ว)
    let combinedColors = null;
    if (inputData.colorCount) {
      const front = Number(inputData.colorCount) || 0;
      const backRaw = inputData.backColors;
      const back = (backRaw !== undefined && backRaw !== '' && backRaw !== null)
        ? (Number(backRaw) || 0) : 0;
      combinedColors = front + back;
      specs.colorCount = combinedColors > 0 ? combinedColors : front;
      specs.frontColors = front;
      specs.backColors = back;
    }

    // Resolution (inkjet)
    if (inputData.resolution) specs.resolution = inputData.resolution;

    // Page count (book/catalog)
    if (inputData.pageCount) specs.pageCount = Number(inputData.pageCount);

    // Binding type (book/catalog)
    if (inputData.bindingType) specs.bindingType = inputData.bindingType;

    // Quantity
    if (inputData.quantity) specs.quantity = Number(inputData.quantity);

    // Finishing options
    specs.finishing = inputData.finishing || [];

    // Print sides and method
    // "1" = 1 หน้า, "2" = Sheetwise (2 เพลท), "work-and-turn" = หน้าในตัว (1 เพลท), "work-and-tumble" = กลับคิปเปอร์ (1 เพลท)
    const printSidesValue = inputData.printSides || '1';
    if (printSidesValue === '1') {
      specs.printSides = 1;
      specs.printMethod = 'single';
    } else if (printSidesValue === '2') {
      specs.printSides = 2;
      specs.printMethod = 'sheetwise';
    } else if (printSidesValue === 'work-and-turn') {
      specs.printSides = 2;
      specs.printMethod = 'work-and-turn';
    } else if (printSidesValue === 'work-and-tumble') {
      specs.printSides = 2;
      specs.printMethod = 'work-and-tumble';
    } else {
      specs.printSides = 1;
      specs.printMethod = 'single';
    }

    // screen / industrialOffset: ใช้สีด้านหน้า+หลังรวมเป็น colorCount แล้ว
    // จึงไม่ให้ engine คูณ ×2 ซ้ำ (sheetwise) — บังคับ multiplier = 1
    // (pressSheet มี logic per-side ของตัวเองผ่าน inputPrintMethod ไม่ผ่านบล็อกนี้)
    if ((this.currentSystem === 'screen' || this.currentSystem === 'industrialOffset')
        && combinedColors !== null && specs.backColors > 0) {
      specs.printSides = 2;
      specs.printMethod = 'perSideCombined';
    }

    // Paper calculator fields
    if (inputData.gsm) specs.gsm = Number(inputData.gsm);
    if (inputData.sheetSize) specs.sheetSize = inputData.sheetSize;
    if (inputData.quantityUnit) specs.quantityUnit = inputData.quantityUnit;

    // Press sheet calculator fields
    if (inputData.jobType) specs.jobType = inputData.jobType;
    if (inputData.printMethod) specs.printMethod = inputData.printMethod;
    if (inputData.paperType) specs.paperType = inputData.paperType;
    if (inputData.pressType) specs.pressType = inputData.pressType;

    // inkType: ตั้งเฉพาะเมื่อฟอร์มมีช่องเลือกหมึกจริง (pressSheet)
    // ระบบอื่น (industrialOffset/screen) ไม่มีช่องนี้ → ปล่อยให้ engine อนุมานจากวัสดุ (เช่น PVC → UV)
    if (inputData.inkType === 'uv' || inputData.inkType === 'conventional') {
      specs.inkType = inputData.inkType;
    }

    // pressSheet: จำนวนหน้า + สีต่อด้าน (Req 3.1, 3.2, 3.8)
    // คง specs.colorCount เดิมไว้เป็น fallback ของ engine เมื่อไม่มี frontColors (legacy)
    if (inputData.sides !== undefined && inputData.sides !== '' && inputData.sides !== null) {
      specs.sides = Number(inputData.sides);
    }
    if (inputData.frontColors !== undefined && inputData.frontColors !== '' && inputData.frontColors !== null) {
      specs.frontColors = Number(inputData.frontColors);
    }
    if (inputData.backColors !== undefined && inputData.backColors !== '' && inputData.backColors !== null) {
      specs.backColors = Number(inputData.backColors);
    }

    // pressSheet: Gripper / Side Lay overrides (Req 5.4–5.5)
    // Form input หน่วย mm แต่ engine คาดค่า cm → หาร 10
    if (inputData.gripperOverride !== undefined && inputData.gripperOverride !== '' && inputData.gripperOverride !== null) {
      const g = Number(inputData.gripperOverride);
      if (Number.isFinite(g)) specs.gripperOverride = g / 10;
    }
    if (inputData.sideLayOverride !== undefined && inputData.sideLayOverride !== '' && inputData.sideLayOverride !== null) {
      const s = Number(inputData.sideLayOverride);
      if (Number.isFinite(s)) specs.sideLayOverride = s / 10;
    }

    return specs;
  },

  // ===== Session management =====

  /**
   * Save current selections to sessionStorage
   */
  _saveSession() {
    try {
      const session = {
        system: this.currentSystem,
        product: this.currentProduct,
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      // Silently fail if sessionStorage is unavailable
    }
  },

  /**
   * Restore session state from sessionStorage
   */
  _restoreSession() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return;

      const session = JSON.parse(raw);
      if (session.system) {
        this.selectSystem(session.system);
        if (session.product) {
          this.selectProduct(session.product);
        }
      }
    } catch (e) {
      // Silently fail if sessionStorage is unavailable or data is corrupted
    }
  },

  // ===== UI utility methods =====

  /**
   * Hide a section by ID
   */
  _hideSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  },

  /**
   * Show a section by ID
   */
  _showSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  },

  /**
   * Clear form fields content
   */
  _clearFormFields() {
    const formFields = document.getElementById('formFields');
    if (formFields) formFields.innerHTML = '';
  },
};

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Calculator.init();
  // แสดงเวอร์ชันที่โหลดจริง (ช่วยตรวจว่าเบราว์เซอร์โหลด JS ใหม่หรือยัง)
  try {
    var APP_VERSION = 'v30';
    var v1 = document.getElementById('appVersion');
    if (v1) v1.textContent = 'เวอร์ชัน ' + APP_VERSION;
    var v2 = document.getElementById('appVersionTop');
    if (v2) v2.textContent = '✓ โหลดเวอร์ชัน ' + APP_VERSION + ' แล้ว';
    console.log('ThaiPrint calculator ' + APP_VERSION + ' loaded');
  } catch (e) { /* ignore */ }
});

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
