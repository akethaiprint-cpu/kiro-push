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
      { key: 'ivoryBoard', name: 'อาร์ตการ์ด 1 หน้า (Ivory)' },
      { key: 'greyBack', name: 'กล่องแป้งหลังเทา' },
      { key: 'kraft', name: 'คราฟท์' },
      { key: 'cardWhite', name: 'กระดาษการ์ดขาว' },
    ],
  },

  /**
   * Session storage key for retaining selections
   */
  SESSION_KEY: 'tp_calculator_session',

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
        if (e.target && e.target.id === 'inputQuantity') {
          this.handleQuantityChange(e.target.value);
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
    if (system === 'paperCalc') {
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
    totalEl.innerHTML = `
      <div class="result-total-row">
        <span class="result-total-label">ราคารวม</span>
        <span class="result-total-amount">${PricingEngine.formatCurrency(result.totalPrice)}</span>
      </div>
      <div class="result-unit-row">
        <span class="result-unit-label">ราคาต่อหน่วย (${result.quantity.toLocaleString()} ชิ้น)</span>
        <span class="result-unit-amount">${PricingEngine.formatCurrency(result.unitPrice)}</span>
      </div>`;

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
    if (!this.currentSystem || !this.currentProduct) return;

    // Collect form data
    const inputData = this._collectFormData();

    // Paper calculator: skip Validator, just check required fields
    if (this.currentSystem === 'paperCalc') {
      if (!inputData.gsm || !inputData.sheetSize || !inputData.quantity) {
        this.renderError([{ field: 'form', message: 'กรุณากรอกข้อมูลให้ครบ (แกรม, ขนาดแผ่น, จำนวน)' }]);
        return;
      }
    } else {
      // Auto-fill width/height from standard size before validation
      if (inputData.standardSize && (!inputData.width || !inputData.height)) {
        const stdSizes = { 'A5': { w: '14.8', h: '21' }, 'A4': { w: '21', h: '29.7' }, 'A3': { w: '29.7', h: '42' } };
        const std = stdSizes[inputData.standardSize];
        if (std) {
          inputData.width = std.w;
          inputData.height = std.h;
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
    const standardSizes = productPriceData && productPriceData.standardSizes
      ? productPriceData.standardSizes
      : ['A5', 'A4', 'A3'];

    const options = standardSizes.map((s) =>
      `<option value="${s}">${s}</option>`
    ).join('');

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
      <div class="form-group">
        <div class="form-field">
          <label for="inputColorCount">จำนวนสี</label>
          <input type="number" id="inputColorCount" name="colorCount" min="${min}" max="${max}" step="1" placeholder="${min}–${max} สี" required>
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
            <option value="31x43">31 × 43 นิ้ว (เพลทตัด 2)</option>
            <option value="25x36">25 × 36 นิ้ว</option>
            <option value="24x35">24 × 35 นิ้ว (เพลทตัด 4)</option>
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

    // Standard size auto-fill (A5, A4, A3) — ถ้าเลือกขนาดมาตรฐานแล้วไม่ได้กรอก width/height
    if (inputData.standardSize && (!specs.size.width || !specs.size.height)) {
      const standardSizes = {
        'A5': { width: 14.8, height: 21.0 },
        'A4': { width: 21.0, height: 29.7 },
        'A3': { width: 29.7, height: 42.0 },
      };
      const std = standardSizes[inputData.standardSize];
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

    // Color count
    if (inputData.colorCount) specs.colorCount = Number(inputData.colorCount);

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

    // Paper calculator fields
    if (inputData.gsm) specs.gsm = Number(inputData.gsm);
    if (inputData.sheetSize) specs.sheetSize = inputData.sheetSize;
    if (inputData.quantityUnit) specs.quantityUnit = inputData.quantityUnit;

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
});

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
