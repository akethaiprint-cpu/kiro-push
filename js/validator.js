/**
 * Input Validator
 * ตรวจสอบข้อมูลที่ผู้ใช้กรอก — error messages ภาษาไทย
 * คืนค่า error ทั้งหมดพร้อมกัน (ไม่หยุดที่ error แรก)
 */
const Validator = {
  /**
   * Validation constraints per system and product type
   */
  CONSTRAINTS: {
    screen: {
      sticker: {
        size: { min: 1.0, max: 100.0 },
        colorCount: { min: 1, max: 8 },
        quantity: { min: 100, max: 1000000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      box: {
        size: { min: 1, max: 100 },
        colorCount: { min: 1, max: 8 },
        quantity: { min: 100, max: 100000 },
        requiredFields: ['width', 'height', 'depth', 'material', 'colorCount', 'quantity'],
      },
      fabricBag: {
        size: { min: 1, max: 100 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 1, max: 100000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      label: {
        size: { min: 1.0, max: 50.0 },
        colorCount: { min: 1, max: 8 },
        quantity: { min: 100, max: 1000000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
    },
    digitalOffset: {
      sticker: {
        size: { min: 1.0, max: 32.0 },
        quantity: { min: 1, max: 10000 },
        requiredFields: ['width', 'height', 'material', 'quantity'],
      },
      label: {
        size: { min: 1.0, max: 32.0 },
        quantity: { min: 1, max: 10000 },
        requiredFields: ['width', 'height', 'material', 'quantity'],
      },
      boxSmall: {
        size: { min: 1, max: 50 },
        quantity: { min: 1, max: 5000 },
        requiredFields: ['width', 'height', 'depth', 'material', 'quantity'],
      },
      businessCard: {
        size: { fixed: true },
        quantity: { min: 50, max: 5000 },
        requiredFields: ['material', 'quantity'],
      },
    },
    industrialOffset: {
      sticker: {
        size: { min: 1.0, max: 60.0 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 1000, max: 1000000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      label: {
        size: { min: 1.0, max: 60.0 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 1000, max: 1000000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      box: {
        size: { min: 1, max: 60 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 1000, max: 100000 },
        requiredFields: ['width', 'height', 'depth', 'material', 'colorCount', 'quantity'],
      },
      brochure: {
        size: { min: 1, max: 60 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 500, max: 100000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      leaflet: {
        size: { min: 1, max: 60 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 500, max: 100000 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity'],
      },
      book: {
        size: { min: 1, max: 60 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 500, max: 100000 },
        pageCount: { min: 4, max: 500, divisibleBy: 4 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity', 'pageCount', 'bindingType'],
      },
      catalog: {
        size: { min: 1, max: 60 },
        colorCount: { min: 1, max: 4 },
        quantity: { min: 500, max: 100000 },
        pageCount: { min: 4, max: 500, divisibleBy: 4 },
        requiredFields: ['width', 'height', 'material', 'colorCount', 'quantity', 'pageCount', 'bindingType'],
      },
    },
    inkjet: {
      vinylSign: {
        size: { min: 10, max: 3000 },
        quantity: { min: 1, max: 1000 },
        requiredFields: ['width', 'height', 'media', 'resolution', 'quantity'],
      },
      largeSticker: {
        size: { min: 10, max: 3000 },
        quantity: { min: 1, max: 1000 },
        requiredFields: ['width', 'height', 'media', 'resolution', 'quantity'],
      },
      banner: {
        size: { min: 10, max: 3000 },
        quantity: { min: 1, max: 1000 },
        requiredFields: ['width', 'height', 'media', 'resolution', 'quantity'],
      },
      poster: {
        size: { min: 10, max: 3000 },
        quantity: { min: 1, max: 1000 },
        requiredFields: ['width', 'height', 'media', 'resolution', 'quantity'],
      },
    },
  },

  /**
   * System display names for error messages
   */
  SYSTEM_NAMES: {
    screen: 'ซิลค์สกรีน',
    digitalOffset: 'ดิจิทัล Offset',
    industrialOffset: 'Offset อุตสาหกรรม',
    inkjet: 'อิงค์เจ็ท',
  },

  /**
   * Field display names for error messages
   */
  FIELD_NAMES: {
    width: 'ความกว้าง',
    height: 'ความยาว',
    depth: 'ความสูง',
    material: 'ประเภทวัสดุ',
    media: 'ประเภทวัสดุพิมพ์',
    colorCount: 'จำนวนสี',
    quantity: 'จำนวน',
    resolution: 'ความละเอียด',
    pageCount: 'จำนวนหน้า',
    bindingType: 'ประเภทเข้าเล่ม',
  },

  /**
   * Main validation entry point
   * @param {string} system - Printing system key
   * @param {string} productType - Product type key
   * @param {object} inputData - Form data to validate
   * @returns {ValidationResult} - { valid: boolean, errors: Array<{field, message}> }
   */
  validate(system, productType, inputData) {
    const errors = [];
    const constraints = this.getConstraints(system, productType);

    if (!constraints) {
      errors.push({
        field: 'system',
        message: 'ไม่พบข้อมูลระบบพิมพ์หรือประเภทสินค้าที่เลือก',
      });
      return { valid: false, errors };
    }

    // 1. Check required fields
    const requiredErrors = this.validateRequired(inputData, constraints.requiredFields);
    errors.push(...requiredErrors);

    // 2. Validate numeric fields (only if they have a value)
    const numericFields = ['width', 'height', 'depth', 'colorCount', 'quantity', 'pageCount'];
    for (const field of numericFields) {
      if (inputData[field] !== undefined && inputData[field] !== null && inputData[field] !== '') {
        const numericErrors = this.validateNumeric(inputData[field], field);
        errors.push(...numericErrors);
      }
    }

    // 3. Validate size (only if width/height are valid numbers)
    if (!constraints.size || constraints.size.fixed) {
      // No size validation needed (e.g., businessCard)
    } else {
      const size = {};
      if (this._isValidPositiveNumber(inputData.width)) size.width = Number(inputData.width);
      if (this._isValidPositiveNumber(inputData.height)) size.height = Number(inputData.height);
      if (this._isValidPositiveNumber(inputData.depth)) size.depth = Number(inputData.depth);

      const sizeErrors = this.validateSize(size, constraints);
      errors.push(...sizeErrors);
    }

    // 4. Validate quantity (only if it's a valid number)
    if (this._isValidPositiveNumber(inputData.quantity)) {
      const qtyErrors = this.validateQuantity(Number(inputData.quantity), constraints);
      errors.push(...qtyErrors);
    }

    // 5. Validate color count (only if applicable and valid number)
    if (constraints.colorCount && this._isValidPositiveNumber(inputData.colorCount)) {
      const colorCount = Number(inputData.colorCount);
      if (colorCount < constraints.colorCount.min || colorCount > constraints.colorCount.max) {
        errors.push({
          field: 'colorCount',
          message: `จำนวนสีต้องอยู่ระหว่าง ${constraints.colorCount.min} ถึง ${constraints.colorCount.max} สี`,
        });
      }
    }

    // 6. Validate page count (only for book/catalog)
    if (constraints.pageCount && this._isValidPositiveNumber(inputData.pageCount)) {
      const pageCount = Number(inputData.pageCount);
      const pageErrors = this._validatePageCount(pageCount, constraints.pageCount);
      errors.push(...pageErrors);
    }

    // Deduplicate errors by field (keep first error per field)
    const uniqueErrors = this._deduplicateErrors(errors);

    return {
      valid: uniqueErrors.length === 0,
      errors: uniqueErrors,
    };
  },

  /**
   * Return constraints for a given system and product type
   * @param {string} system - Printing system key
   * @param {string} productType - Product type key
   * @returns {object|null} - Constraints object or null if not found
   */
  getConstraints(system, productType) {
    if (!this.CONSTRAINTS[system]) return null;
    if (!this.CONSTRAINTS[system][productType]) return null;
    return this.CONSTRAINTS[system][productType];
  },

  /**
   * Validate size dimensions against constraints
   * @param {object} size - { width?, height?, depth? } in cm
   * @param {object} constraints - Constraints object with size.min and size.max
   * @returns {Array<ValidationError>}
   */
  validateSize(size, constraints) {
    const errors = [];
    if (!constraints.size || constraints.size.fixed) return errors;

    const { min, max } = constraints.size;

    if (size.width !== undefined) {
      if (size.width < min) {
        errors.push({
          field: 'width',
          message: `ความกว้างต้องไม่น้อยกว่า ${min} ซม.`,
        });
      } else if (size.width > max) {
        errors.push({
          field: 'width',
          message: `ความกว้างสูงสุดสำหรับระบบ${this._getSystemName(constraints)}คือ ${max} ซม.`,
        });
      }
    }

    if (size.height !== undefined) {
      if (size.height < min) {
        errors.push({
          field: 'height',
          message: `ความยาวต้องไม่น้อยกว่า ${min} ซม.`,
        });
      } else if (size.height > max) {
        errors.push({
          field: 'height',
          message: `ความยาวสูงสุดสำหรับระบบ${this._getSystemName(constraints)}คือ ${max} ซม.`,
        });
      }
    }

    if (size.depth !== undefined) {
      if (size.depth < min) {
        errors.push({
          field: 'depth',
          message: `ความสูงต้องไม่น้อยกว่า ${min} ซม.`,
        });
      } else if (size.depth > max) {
        errors.push({
          field: 'depth',
          message: `ความสูงสูงสุดสำหรับระบบ${this._getSystemName(constraints)}คือ ${max} ซม.`,
        });
      }
    }

    return errors;
  },

  /**
   * Validate quantity against constraints
   * @param {number} qty - Quantity value
   * @param {object} constraints - Constraints object with quantity.min and quantity.max
   * @returns {Array<ValidationError>}
   */
  validateQuantity(qty, constraints) {
    const errors = [];
    if (!constraints.quantity) return errors;

    const { min, max } = constraints.quantity;

    if (qty < min) {
      errors.push({
        field: 'quantity',
        message: `จำนวนขั้นต่ำคือ ${min.toLocaleString()} ชิ้น`,
      });
    } else if (qty > max) {
      errors.push({
        field: 'quantity',
        message: `จำนวนสูงสุดคือ ${max.toLocaleString()} ชิ้น`,
      });
    }

    return errors;
  },

  /**
   * Check all required fields are filled
   * @param {object} inputData - Form data
   * @param {Array<string>} requiredFields - List of required field names
   * @returns {Array<ValidationError>}
   */
  validateRequired(inputData, requiredFields) {
    const errors = [];
    if (!requiredFields) return errors;

    for (const field of requiredFields) {
      const value = inputData[field];
      if (value === undefined || value === null || value === '') {
        const fieldName = this.FIELD_NAMES[field] || field;
        errors.push({
          field: field,
          message: `กรุณากรอก${fieldName}`,
        });
      }
    }

    return errors;
  },

  /**
   * Check that a value is a positive number
   * @param {*} value - Value to check
   * @param {string} fieldName - Field name for error message
   * @returns {Array<ValidationError>}
   */
  validateNumeric(value, fieldName) {
    const errors = [];
    const num = Number(value);

    if (isNaN(num) || num <= 0) {
      const displayName = this.FIELD_NAMES[fieldName] || fieldName;
      errors.push({
        field: fieldName,
        message: `${displayName}ต้องเป็นตัวเลขที่มากกว่า 0`,
      });
    }

    return errors;
  },

  // ===== Private helper methods =====

  /**
   * Check if a value is a valid positive number
   * @param {*} value
   * @returns {boolean}
   */
  _isValidPositiveNumber(value) {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 0;
  },

  /**
   * Validate page count for book/catalog
   * @param {number} pageCount
   * @param {object} pageConstraints - { min, max, divisibleBy }
   * @returns {Array<ValidationError>}
   */
  _validatePageCount(pageCount, pageConstraints) {
    const errors = [];

    if (pageCount < pageConstraints.min) {
      errors.push({
        field: 'pageCount',
        message: `จำนวนหน้าขั้นต่ำคือ ${pageConstraints.min} หน้า`,
      });
    } else if (pageCount > pageConstraints.max) {
      errors.push({
        field: 'pageCount',
        message: `จำนวนหน้าสูงสุดคือ ${pageConstraints.max} หน้า`,
      });
    } else if (pageConstraints.divisibleBy && pageCount % pageConstraints.divisibleBy !== 0) {
      errors.push({
        field: 'pageCount',
        message: `จำนวนหน้าต้องหารด้วย ${pageConstraints.divisibleBy} ลงตัว`,
      });
    }

    return errors;
  },

  /**
   * Get system display name from constraints (by finding which system the constraints belong to)
   * @param {object} constraints
   * @returns {string}
   */
  _getSystemName(constraints) {
    for (const [system, products] of Object.entries(this.CONSTRAINTS)) {
      for (const [, productConstraints] of Object.entries(products)) {
        if (productConstraints === constraints) {
          return this.SYSTEM_NAMES[system] || system;
        }
      }
    }
    return '';
  },

  /**
   * Deduplicate errors - keep first error per field
   * @param {Array<ValidationError>} errors
   * @returns {Array<ValidationError>}
   */
  _deduplicateErrors(errors) {
    const seen = new Set();
    const unique = [];
    for (const error of errors) {
      if (!seen.has(error.field)) {
        seen.add(error.field);
        unique.push(error);
      }
    }
    return unique;
  },
};

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
}
