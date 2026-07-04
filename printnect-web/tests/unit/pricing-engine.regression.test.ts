// @ts-nocheck
/**
 * Regression baseline — ยกจาก tests/pricing-engine.test.js (เว็บเดิม)
 * รันกับโดเมน TypeScript ที่พอร์ต: @/domain/pricing + default price table
 * ผลตัวเลขต้องตรงกับเว็บเดิม (Req 4.1, 4.3)
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PricingEngine } from '@/domain/pricing';
import { getDefaultPriceTable } from '@/lib/price-table/default-price-table';

const StorageManager = { getDefaultPriceTable };

/**
 * KNOWN_FAILING_BASELINE (Req 4.4) — เทสต์ค่า 14 ตัวนี้ fail อยู่แล้วในเว็บเดิม
 * (ยืนยันด้วยการรัน tests/pricing-engine.test.js เดิม: fail set ตรงกันทุกตัว)
 * เกิดจากค่าราคาที่ตั้งใจเปลี่ยนภายหลัง (screen sticker plateCost, inkjet media/finishing)
 * จึงไม่ถือเป็น regression ใหม่จากการพอร์ต:
 *   - PricingEngine > calculateScreen — sticker > should calculate sticker price correctly
 *   - PricingEngine > calculateScreen — sticker > should use correct tier for different quantities
 *   - Inkjet — vinylSign (720dpi / 1440dpi / uvCoating / eyelet / hemming / woodFrame / multiple)
 *   - Inkjet — largeSticker (price / laminate)
 *   - Inkjet — banner (eyelet+hemming)
 *   - Inkjet — poster (price / laminate)
 * ผลรวม: 134 passed / 14 failed — ตรงกับ baseline เว็บเดิม 1:1
 */

describe('PricingEngine', () => {
  const priceTable = StorageManager.getDefaultPriceTable();

  describe('calculateArea', () => {
    it('should calculate area as width × height', () => {
      expect(PricingEngine.calculateArea(10, 5)).toBe(50);
      expect(PricingEngine.calculateArea(1, 1)).toBe(1);
      expect(PricingEngine.calculateArea(100, 100)).toBe(10000);
    });

    it('should handle decimal values', () => {
      expect(PricingEngine.calculateArea(5.5, 3.2)).toBeCloseTo(17.6);
    });
  });

  describe('calculatePlateCost', () => {
    it('should calculate plate cost as colors × plateRate', () => {
      expect(PricingEngine.calculatePlateCost(1, 800)).toBe(800);
      expect(PricingEngine.calculatePlateCost(4, 800)).toBe(3200);
      expect(PricingEngine.calculatePlateCost(8, 1200)).toBe(9600);
    });
  });

  describe('calculateMaterialCost', () => {
    it('should calculate material cost as area × qty × materialRate', () => {
      expect(PricingEngine.calculateMaterialCost(50, 1000, 0.005)).toBeCloseTo(250);
      expect(PricingEngine.calculateMaterialCost(100, 500, 0.012)).toBeCloseTo(600);
    });
  });

  describe('calculateScreen — sticker', () => {
    it('should calculate sticker price correctly', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'paper',
        colorCount: 2,
        quantity: 1000
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);

      expect(result.success).toBe(true);
      expect(result.system).toBe('screen');
      expect(result.productType).toBe('sticker');
      expect(result.quantity).toBe(1000);

      // plateCost = 800 × 2 = 1600
      // printCost = 1.00 × 2 × 1000 = 2000 (tier: 501-1000 → 1.00)
      // materialCost = 50 × 1000 × 0.005 = 250
      // total = 1600 + 2000 + 250 = 3850
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าทำบล็อก', amount: 1600, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์ต่อสี', amount: 2000, conditional: false });
      expect(result.costBreakdown[2]).toEqual({ label: 'ค่าวัสดุ', amount: 250, conditional: false });
      expect(result.totalPrice).toBe(3850);
      expect(result.unitPrice).toBeCloseTo(3.85);
      expect(result.error).toBeNull();
    });

    it('should use correct tier for different quantities', () => {
      const specs = {
        size: { width: 5, height: 5 },
        material: 'pvc',
        colorCount: 1,
        quantity: 200
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);

      // plateCost = 800 × 1 = 800
      // printCost = 1.50 × 1 × 200 = 300 (tier: 100-500 → 1.50)
      // materialCost = 25 × 200 × 0.012 = 60
      // total = 800 + 300 + 60 = 1160
      expect(result.success).toBe(true);
      expect(result.totalPrice).toBe(1160);
    });

    it('should return error for invalid material', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'nonexistent',
        colorCount: 2,
        quantity: 1000
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('วัสดุ');
    });

    it('should return error for quantity outside tiers', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'paper',
        colorCount: 2,
        quantity: 50 // below minimum tier of 100
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('จำนวน');
    });
  });

  describe('calculateScreen — box', () => {
    it('should calculate box price with surface area', () => {
      const specs = {
        size: { width: 10, height: 15, depth: 5 },
        material: 'artCard300',
        colorCount: 3,
        quantity: 500
      };
      const result = PricingEngine.calculateScreen('box', specs, priceTable);

      expect(result.success).toBe(true);
      // surfaceArea = 2*(10*15 + 10*5 + 15*5) = 2*(150+50+75) = 550 sq cm
      // plateCost = 1200 × 3 = 3600
      // printCost = 2.50 × 3 × 500 = 3750 (tier: 100-500 → 2.50)
      // materialCost = 550 × 500 × 0.008 = 2200
      // dieCutCost: surfaceArea=550 → tier 501-2000 → 2500
      // total = 3600 + 3750 + 2200 + 2500 = 12050
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าทำบล็อก', amount: 3600, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์ต่อสี', amount: 3750, conditional: false });
      expect(result.costBreakdown[2]).toEqual({ label: 'ค่ากระดาษ', amount: 2200, conditional: false });
      expect(result.costBreakdown[3]).toEqual({ label: 'ค่าไดคัท', amount: 2500, conditional: true });
      expect(result.totalPrice).toBe(12050);
      expect(result.unitPrice).toBeCloseTo(24.1);
    });
  });

  describe('calculateScreen — fabricBag', () => {
    it('should calculate fabric bag price with size tier', () => {
      const specs = {
        size: { width: 30, height: 40 },
        material: 'cotton',
        colorCount: 2,
        quantity: 200
      };
      const result = PricingEngine.calculateScreen('fabricBag', specs, priceTable);

      expect(result.success).toBe(true);
      // bagArea = 30 × 40 = 1200 → size tier 901-2500 → price 25
      // plateCost = 600 × 2 = 1200
      // printCost = 5.00 × 2 × 200 = 2000 (tier: 101-500 → 5.00)
      // materialCost = 25 × 200 = 5000
      // total = 1200 + 2000 + 5000 = 8200
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าทำบล็อก', amount: 1200, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์ต่อสี', amount: 2000, conditional: false });
      expect(result.costBreakdown[2]).toEqual({ label: 'ค่าถุงผ้า', amount: 5000, conditional: false });
      expect(result.totalPrice).toBe(8200);
      expect(result.unitPrice).toBeCloseTo(41);
    });

    it('should use small size tier for small bags', () => {
      const specs = {
        size: { width: 20, height: 25 },
        material: 'spunbond',
        colorCount: 1,
        quantity: 50
      };
      const result = PricingEngine.calculateScreen('fabricBag', specs, priceTable);

      expect(result.success).toBe(true);
      // bagArea = 20 × 25 = 500 → size tier 0-900 → price 8
      // plateCost = 600 × 1 = 600
      // printCost = 8.00 × 1 × 50 = 400 (tier: 1-100 → 8.00)
      // materialCost = 8 × 50 = 400
      // total = 600 + 400 + 400 = 1400
      expect(result.totalPrice).toBe(1400);
    });
  });

  describe('calculateScreen — label', () => {
    it('should calculate label price correctly', () => {
      const specs = {
        size: { width: 8, height: 5 },
        material: 'artPaper',
        colorCount: 3,
        quantity: 2000
      };
      const result = PricingEngine.calculateScreen('label', specs, priceTable);

      expect(result.success).toBe(true);
      // area = 8 × 5 = 40
      // plateCost = 800 × 3 = 2400
      // printCost = 0.50 × 3 × 2000 = 3000 (tier: 1001-5000 → 0.50)
      // materialCost = 40 × 2000 × 0.006 = 480
      // total = 2400 + 3000 + 480 = 5880
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าทำบล็อก', amount: 2400, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์ต่อสี', amount: 3000, conditional: false });
      expect(result.costBreakdown[2]).toEqual({ label: 'ค่าวัสดุ', amount: 480, conditional: false });
      expect(result.totalPrice).toBe(5880);
      expect(result.unitPrice).toBeCloseTo(2.94);
    });
  });

  describe('calculate — routing', () => {
    it('should route to calculateScreen for screen system', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'paper',
        colorCount: 1,
        quantity: 500
      };
      const result = PricingEngine.calculate('screen', 'sticker', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.system).toBe('screen');
    });

    it('should return error for unknown system', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'paper', colorCount: 1, quantity: 500 };
      const result = PricingEngine.calculate('unknown', 'sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ไม่พบระบบพิมพ์');
    });

    it('should return error for invalid product type', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'paper', colorCount: 1, quantity: 500 };
      const result = PricingEngine.calculate('screen', 'nonexistent', specs, priceTable);
      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error when priceTable is null', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'paper', colorCount: 1, quantity: 500 };
      const result = PricingEngine.calculateScreen('sticker', specs, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error when priceTable has no screen section', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'paper', colorCount: 1, quantity: 500 };
      const result = PricingEngine.calculateScreen('sticker', specs, {});
      expect(result.success).toBe(false);
    });
  });

  describe('CalculationResult structure', () => {
    it('should return all required fields in CalculationResult', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'paper',
        colorCount: 1,
        quantity: 500
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('productType');
      expect(result).toHaveProperty('costBreakdown');
      expect(result).toHaveProperty('totalPrice');
      expect(result).toHaveProperty('unitPrice');
      expect(result).toHaveProperty('quantity');
      expect(result).toHaveProperty('error');
      expect(Array.isArray(result.costBreakdown)).toBe(true);
    });

    it('should have cost breakdown items with label, amount, conditional', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'paper',
        colorCount: 1,
        quantity: 500
      };
      const result = PricingEngine.calculateScreen('sticker', specs, priceTable);

      for (const item of result.costBreakdown) {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('amount');
        expect(item).toHaveProperty('conditional');
        expect(typeof item.label).toBe('string');
        expect(typeof item.amount).toBe('number');
        expect(typeof item.conditional).toBe('boolean');
      }
    });
  });
});


describe('PricingEngine.formatCurrency', () => {
  it('should format zero as ฿0.00', () => {
    expect(PricingEngine.formatCurrency(0)).toBe('฿0.00');
  });

  it('should format small amounts without commas', () => {
    expect(PricingEngine.formatCurrency(1)).toBe('฿1.00');
    expect(PricingEngine.formatCurrency(99.99)).toBe('฿99.99');
    expect(PricingEngine.formatCurrency(999)).toBe('฿999.00');
  });

  it('should add comma separator for thousands', () => {
    expect(PricingEngine.formatCurrency(1000)).toBe('฿1,000.00');
    expect(PricingEngine.formatCurrency(1234.5)).toBe('฿1,234.50');
    expect(PricingEngine.formatCurrency(9999.99)).toBe('฿9,999.99');
  });

  it('should add multiple comma separators for large amounts', () => {
    expect(PricingEngine.formatCurrency(1000000)).toBe('฿1,000,000.00');
    expect(PricingEngine.formatCurrency(1234567.89)).toBe('฿1,234,567.89');
    expect(PricingEngine.formatCurrency(10000000)).toBe('฿10,000,000.00');
  });

  it('should always show exactly 2 decimal places', () => {
    expect(PricingEngine.formatCurrency(5)).toBe('฿5.00');
    expect(PricingEngine.formatCurrency(5.1)).toBe('฿5.10');
    expect(PricingEngine.formatCurrency(5.123)).toBe('฿5.12');
  });

  it('should handle decimal amounts less than 1', () => {
    expect(PricingEngine.formatCurrency(0.5)).toBe('฿0.50');
    expect(PricingEngine.formatCurrency(0.01)).toBe('฿0.01');
  });

  it('should start with Thai Baht symbol ฿', () => {
    const result = PricingEngine.formatCurrency(100);
    expect(result.startsWith('฿')).toBe(true);
  });
});


/**
 * Unit tests for PricingEngine — Digital Offset calculation (Task 4.3)
 * Validates: Requirements 6.5, 6.6
 */
describe('PricingEngine — Digital Offset', () => {
  const priceTable = StorageManager.getDefaultPriceTable();

  describe('calculateDigitalOffset — sticker', () => {
    it('should calculate sticker price without plate cost', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        quantity: 200,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);

      expect(result.success).toBe(true);
      expect(result.system).toBe('digitalOffset');
      expect(result.productType).toBe('sticker');
      expect(result.quantity).toBe(200);

      // perSheetPrice: qty 200 → tier 101-500 → 8.00 per sheet
      // printingCost = 8.00 × 200 = 1600
      // materialCost = 50 (area) × 200 × 0.007 = 70
      // finishingCost = 0
      // total = 1600 + 70 = 1670
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าพิมพ์ต่อแผ่น', amount: 1600, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าวัสดุ', amount: 70, conditional: false });
      expect(result.totalPrice).toBe(1670);
      expect(result.unitPrice).toBeCloseTo(8.35);
      expect(result.error).toBeNull();
    });

    it('should NOT include plate cost in breakdown', () => {
      const specs = {
        size: { width: 5, height: 5 },
        material: 'stickerPaper',
        quantity: 100,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);

      expect(result.success).toBe(true);
      // Verify no plate cost item exists
      const labels = result.costBreakdown.map(item => item.label);
      expect(labels).not.toContain('ค่าทำบล็อก');
      expect(labels).not.toContain('ค่าเพลท');
    });

    it('should include finishing costs when finishing options selected', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        quantity: 100,
        finishing: ['laminate', 'dieCut']
      };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 100 → tier 1-100 → 12.00
      // printingCost = 12.00 × 100 = 1200
      // materialCost = 50 × 100 × 0.007 = 35
      // laminate: 0.003 × 50 × 100 = 15
      // dieCut: 0.50 × 100 = 50
      // total = 1200 + 35 + 15 + 50 = 1300
      expect(result.totalPrice).toBe(1300);
      expect(result.costBreakdown.length).toBe(4); // printing + material + 2 finishing
      expect(result.costBreakdown[2]).toEqual({ label: 'เคลือบลามิเนต', amount: 15, conditional: true });
      expect(result.costBreakdown[3]).toEqual({ label: 'ไดคัท', amount: 50, conditional: true });
    });
  });

  describe('calculateDigitalOffset — label', () => {
    it('should calculate label price correctly', () => {
      const specs = {
        size: { width: 8, height: 4 },
        material: 'pvc',
        quantity: 500,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('label', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 500 → tier 101-500 → 7.00
      // printingCost = 7.00 × 500 = 3500
      // materialCost = 32 × 500 × 0.014 = 224
      // total = 3500 + 224 = 3724
      expect(result.totalPrice).toBe(3724);
      expect(result.unitPrice).toBeCloseTo(7.448);
    });
  });

  describe('calculateDigitalOffset — boxSmall', () => {
    it('should calculate small box price with surface area', () => {
      const specs = {
        size: { width: 10, height: 10, depth: 5 },
        material: 'artCard',
        quantity: 100,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('boxSmall', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 100 → tier 51-200 → 18.00
      // printingCost = 18.00 × 100 = 1800
      // surfaceArea = 2*(10*10 + 10*5 + 10*5) = 2*(100+50+50) = 400
      // materialCost = 400 × 100 × 0.009 = 360
      // total = 1800 + 360 = 2160
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าพิมพ์ต่อแผ่น', amount: 1800, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าวัสดุ', amount: 360, conditional: false });
      expect(result.totalPrice).toBe(2160);
    });

    it('should include finishing for boxSmall', () => {
      const specs = {
        size: { width: 10, height: 10, depth: 5 },
        material: 'artCard',
        quantity: 100,
        finishing: ['embossStamp']
      };
      const result = PricingEngine.calculateDigitalOffset('boxSmall', specs, priceTable);

      expect(result.success).toBe(true);
      // embossStamp: pricePerPiece 2.00 × 100 = 200
      // total = 1800 + 360 + 200 = 2360
      expect(result.totalPrice).toBe(2360);
      expect(result.costBreakdown[2]).toEqual({ label: 'ปั๊มเค', amount: 200, conditional: true });
    });
  });

  describe('calculateDigitalOffset — businessCard', () => {
    it('should calculate business card price with pricePerCard material', () => {
      const specs = {
        size: { width: 9, height: 5.5 },
        material: 'art260',
        quantity: 200,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('businessCard', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 200 → tier 50-200 → 5.00
      // printingCost = 5.00 × 200 = 1000
      // materialCost = 0.50 × 200 = 100 (pricePerCard)
      // total = 1000 + 100 = 1100
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าพิมพ์ต่อแผ่น', amount: 1000, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าวัสดุ', amount: 100, conditional: false });
      expect(result.totalPrice).toBe(1100);
      expect(result.unitPrice).toBeCloseTo(5.5);
    });

    it('should calculate business card with finishing (pricePerCard)', () => {
      const specs = {
        size: { width: 9, height: 5.5 },
        material: 'art300',
        quantity: 500,
        finishing: ['laminateMatte', 'spotUV']
      };
      const result = PricingEngine.calculateDigitalOffset('businessCard', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 500 → tier 201-500 → 3.50
      // printingCost = 3.50 × 500 = 1750
      // materialCost = 0.70 × 500 = 350 (art300 pricePerCard)
      // laminateMatte: 0.30 × 500 = 150
      // spotUV: 0.80 × 500 = 400
      // total = 1750 + 350 + 150 + 400 = 2650
      expect(result.totalPrice).toBe(2650);
      expect(result.costBreakdown.length).toBe(4);
      expect(result.costBreakdown[2]).toEqual({ label: 'เคลือบลามิเนตด้าน', amount: 150, conditional: true });
      expect(result.costBreakdown[3]).toEqual({ label: 'Spot UV', amount: 400, conditional: true });
    });

    it('should use special paper pricing', () => {
      const specs = {
        size: { width: 9, height: 5 },
        material: 'special',
        quantity: 100,
        finishing: []
      };
      const result = PricingEngine.calculateDigitalOffset('businessCard', specs, priceTable);

      expect(result.success).toBe(true);
      // perSheetPrice: qty 100 → tier 50-200 → 5.00
      // printingCost = 5.00 × 100 = 500
      // materialCost = 1.50 × 100 = 150
      // total = 500 + 150 = 650
      expect(result.totalPrice).toBe(650);
    });
  });

  describe('calculateDigitalOffset — error handling', () => {
    it('should return error when priceTable is null', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 100, finishing: [] };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for invalid product type', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 100, finishing: [] };
      const result = PricingEngine.calculateDigitalOffset('nonexistent', specs, priceTable);
      expect(result.success).toBe(false);
    });

    it('should return error for invalid material', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'nonexistent', quantity: 100, finishing: [] };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('วัสดุ');
    });

    it('should return error for quantity outside tiers', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 50000, finishing: [] };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('จำนวน');
    });

    it('should handle empty finishing array gracefully', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 100, finishing: [] };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.costBreakdown.length).toBe(2); // only printing + material
    });

    it('should handle undefined finishing gracefully', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 100 };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);
      expect(result.success).toBe(true);
    });

    it('should skip unknown finishing options without error', () => {
      const specs = { size: { width: 10, height: 5 }, material: 'artPaper', quantity: 100, finishing: ['unknownOption'] };
      const result = PricingEngine.calculateDigitalOffset('sticker', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.costBreakdown.length).toBe(2); // only printing + material
    });
  });

  describe('calculateDigitalOffset — routing via calculate()', () => {
    it('should route to calculateDigitalOffset for digitalOffset system', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        quantity: 100,
        finishing: []
      };
      const result = PricingEngine.calculate('digitalOffset', 'sticker', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.system).toBe('digitalOffset');
    });
  });
});


describe('PricingEngine — Inkjet calculation (Task 4.7)', () => {
  const priceTable = StorageManager.getDefaultPriceTable();

  describe('calculateInkjet — vinylSign', () => {
    it('should calculate vinyl sign price correctly with 720dpi', () => {
      const specs = {
        size: { width: 300, height: 200 }, // 300cm × 200cm = 6 sq meters
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 2,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      expect(result.system).toBe('inkjet');
      expect(result.productType).toBe('vinylSign');
      expect(result.quantity).toBe(2);

      // area = (300 × 200) / 10000 = 6 sq meters
      // printCost = 120 × 6 × 2 = 1440
      // mediaCost = 180 × 6 × 2 = 2160
      // total = 1440 + 2160 = 3600
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าพิมพ์', amount: 1440, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าวัสดุ', amount: 2160, conditional: false });
      expect(result.totalPrice).toBe(3600);
      expect(result.unitPrice).toBeCloseTo(1800);
      expect(result.error).toBeNull();
    });

    it('should calculate vinyl sign price correctly with 1440dpi', () => {
      const specs = {
        size: { width: 100, height: 100 }, // 1 sq meter
        resolution: '1440dpi',
        media: 'matteVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (100 × 100) / 10000 = 1 sq meter
      // printCost = 180 × 1 × 1 = 180
      // mediaCost = 200 × 1 × 1 = 200
      // total = 180 + 200 = 380
      expect(result.totalPrice).toBeCloseTo(380);
      expect(result.unitPrice).toBeCloseTo(380);
    });

    it('should include area-based finishing costs (uvCoating)', () => {
      const specs = {
        size: { width: 200, height: 100 }, // 2 sq meters
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 3,
        finishing: ['uvCoating']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (200 × 100) / 10000 = 2 sq meters
      // printCost = 120 × 2 × 3 = 720
      // mediaCost = 180 × 2 × 3 = 1080
      // uvCoating = 50 × 2 × 3 = 300
      // total = 720 + 1080 + 300 = 2100
      expect(result.costBreakdown.length).toBe(3);
      expect(result.costBreakdown[2].label).toContain('เคลือบ UV');
      expect(result.costBreakdown[2].amount).toBeCloseTo(300);
      expect(result.totalPrice).toBeCloseTo(2100);
    });

    it('should include perimeter-based finishing costs (eyelet)', () => {
      const specs = {
        size: { width: 300, height: 200 }, // perimeter = 2*(300+200)/100 = 10 meters
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: ['eyelet']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (300 × 200) / 10000 = 6 sq meters
      // printCost = 120 × 6 × 1 = 720
      // mediaCost = 180 × 6 × 1 = 1080
      // perimeter = 2*(300+200)/100 = 10 meters
      // eyelet = 30 × 10 × 1 = 300
      // total = 720 + 1080 + 300 = 2100
      expect(result.costBreakdown[2].label).toContain('เข้าตาไก่');
      expect(result.costBreakdown[2].amount).toBeCloseTo(300);
      expect(result.totalPrice).toBeCloseTo(2100);
    });

    it('should include hemming finishing cost (perimeter-based)', () => {
      const specs = {
        size: { width: 200, height: 100 }, // perimeter = 2*(200+100)/100 = 6 meters
        resolution: '1440dpi',
        media: 'koreanVinyl',
        quantity: 2,
        finishing: ['hemming']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (200 × 100) / 10000 = 2 sq meters
      // printCost = 180 × 2 × 2 = 720
      // mediaCost = 250 × 2 × 2 = 1000
      // perimeter = 2*(200+100)/100 = 6 meters
      // hemming = 25 × 6 × 2 = 300
      // total = 720 + 1000 + 300 = 2020
      expect(result.costBreakdown[2].label).toContain('เย็บขอบ');
      expect(result.costBreakdown[2].amount).toBeCloseTo(300);
      expect(result.totalPrice).toBeCloseTo(2020);
    });

    it('should include woodFrame finishing cost (area-based)', () => {
      const specs = {
        size: { width: 100, height: 100 }, // 1 sq meter
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: ['woodFrame']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // area = 1 sq meter
      // printCost = 120 × 1 × 1 = 120
      // mediaCost = 180 × 1 × 1 = 180
      // woodFrame = 150 × 1 × 1 = 150
      // total = 120 + 180 + 150 = 450
      expect(result.costBreakdown[2].label).toContain('ติดโครงไม้');
      expect(result.costBreakdown[2].amount).toBeCloseTo(150);
      expect(result.totalPrice).toBeCloseTo(450);
    });

    it('should handle multiple finishing options', () => {
      const specs = {
        size: { width: 200, height: 100 }, // 2 sq meters, perimeter = 6m
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: ['uvCoating', 'eyelet', 'hemming']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result.success).toBe(true);
      // printCost = 120 × 2 × 1 = 240
      // mediaCost = 180 × 2 × 1 = 360
      // uvCoating = 50 × 2 × 1 = 100
      // eyelet = 30 × 6 × 1 = 180
      // hemming = 25 × 6 × 1 = 150
      // total = 240 + 360 + 100 + 180 + 150 = 1030
      expect(result.costBreakdown.length).toBe(5);
      expect(result.totalPrice).toBeCloseTo(1030);
    });
  });

  describe('calculateInkjet — largeSticker', () => {
    it('should calculate large sticker price correctly', () => {
      const specs = {
        size: { width: 150, height: 100 }, // 1.5 sq meters
        resolution: '1440dpi',
        media: 'whiteStickerMedia',
        quantity: 5,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('largeSticker', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (150 × 100) / 10000 = 1.5 sq meters
      // printCost = 220 × 1.5 × 5 = 1650
      // mediaCost = 200 × 1.5 × 5 = 1500
      // total = 1650 + 1500 = 3150
      expect(result.totalPrice).toBeCloseTo(3150);
      expect(result.unitPrice).toBeCloseTo(630);
    });

    it('should include laminate finishing for large sticker', () => {
      const specs = {
        size: { width: 100, height: 100 }, // 1 sq meter
        resolution: '720dpi',
        media: 'clearStickerMedia',
        quantity: 2,
        finishing: ['laminate']
      };
      const result = PricingEngine.calculateInkjet('largeSticker', specs, priceTable);

      expect(result.success).toBe(true);
      // area = 1 sq meter
      // printCost = 150 × 1 × 2 = 300
      // mediaCost = 250 × 1 × 2 = 500
      // laminate = 60 × 1 × 2 = 120
      // total = 300 + 500 + 120 = 920
      expect(result.totalPrice).toBeCloseTo(920);
    });
  });

  describe('calculateInkjet — banner', () => {
    it('should calculate banner price correctly', () => {
      const specs = {
        size: { width: 100, height: 200 }, // 2 sq meters
        resolution: '720dpi',
        media: 'bannerFabric',
        quantity: 10,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('banner', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (100 × 200) / 10000 = 2 sq meters
      // printCost = 100 × 2 × 10 = 2000
      // mediaCost = 150 × 2 × 10 = 3000
      // total = 2000 + 3000 = 5000
      expect(result.totalPrice).toBeCloseTo(5000);
      expect(result.unitPrice).toBeCloseTo(500);
    });

    it('should include eyelet and hemming for banner', () => {
      const specs = {
        size: { width: 100, height: 200 }, // perimeter = 2*(100+200)/100 = 6 meters
        resolution: '1440dpi',
        media: 'canvasFabric',
        quantity: 1,
        finishing: ['eyelet', 'hemming']
      };
      const result = PricingEngine.calculateInkjet('banner', specs, priceTable);

      expect(result.success).toBe(true);
      // area = 2 sq meters
      // printCost = 160 × 2 × 1 = 320
      // mediaCost = 220 × 2 × 1 = 440
      // perimeter = 6 meters
      // eyelet = 30 × 6 × 1 = 180
      // hemming = 25 × 6 × 1 = 150
      // total = 320 + 440 + 180 + 150 = 1090
      expect(result.totalPrice).toBeCloseTo(1090);
    });
  });

  describe('calculateInkjet — poster', () => {
    it('should calculate poster price correctly', () => {
      const specs = {
        size: { width: 60, height: 90 }, // 0.54 sq meters
        resolution: '1440dpi',
        media: 'photoPaper',
        quantity: 20,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('poster', specs, priceTable);

      expect(result.success).toBe(true);
      // area = (60 × 90) / 10000 = 0.54 sq meters
      // printCost = 200 × 0.54 × 20 = 2160
      // mediaCost = 180 × 0.54 × 20 = 1944
      // total = 2160 + 1944 = 4104
      expect(result.totalPrice).toBeCloseTo(4104);
      expect(result.unitPrice).toBeCloseTo(205.2);
    });

    it('should include laminate finishing for poster', () => {
      const specs = {
        size: { width: 60, height: 90 }, // 0.54 sq meters
        resolution: '720dpi',
        media: 'artPaper',
        quantity: 1,
        finishing: ['laminate']
      };
      const result = PricingEngine.calculateInkjet('poster', specs, priceTable);

      expect(result.success).toBe(true);
      // area = 0.54 sq meters
      // printCost = 130 × 0.54 × 1 = 70.2
      // mediaCost = 150 × 0.54 × 1 = 81
      // laminate = 60 × 0.54 × 1 = 32.4
      // total = 70.2 + 81 + 32.4 = 183.6
      expect(result.totalPrice).toBeCloseTo(183.6);
    });
  });

  describe('calculateInkjet — error handling', () => {
    it('should return error for invalid product type', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('nonexistent', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ไม่พบข้อมูลราคา');
    });

    it('should return error for invalid resolution', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '300dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ความละเอียด');
    });

    it('should return error for invalid media', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'nonexistentMedia',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('วัสดุ');
    });

    it('should return error when priceTable is null', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should skip unknown finishing options gracefully', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: ['unknownFinish']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);
      expect(result.success).toBe(true);
      // Should only have printCost and mediaCost (unknown finishing skipped)
      expect(result.costBreakdown.length).toBe(2);
    });

    it('should handle empty finishing array', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.costBreakdown.length).toBe(2);
    });

    it('should handle undefined finishing', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.costBreakdown.length).toBe(2);
    });
  });

  describe('calculateInkjet — CalculationResult structure', () => {
    it('should return all required fields', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: ['uvCoating']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('system', 'inkjet');
      expect(result).toHaveProperty('productType', 'vinylSign');
      expect(result).toHaveProperty('costBreakdown');
      expect(result).toHaveProperty('totalPrice');
      expect(result).toHaveProperty('unitPrice');
      expect(result).toHaveProperty('quantity', 1);
      expect(result).toHaveProperty('error', null);
      expect(Array.isArray(result.costBreakdown)).toBe(true);
    });

    it('should have cost breakdown items with correct structure', () => {
      const specs = {
        size: { width: 200, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 2,
        finishing: ['uvCoating', 'eyelet']
      };
      const result = PricingEngine.calculateInkjet('vinylSign', specs, priceTable);

      for (const item of result.costBreakdown) {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('amount');
        expect(item).toHaveProperty('conditional');
        expect(typeof item.label).toBe('string');
        expect(typeof item.amount).toBe('number');
        expect(typeof item.conditional).toBe('boolean');
        expect(item.amount).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateInkjet — routing via calculate()', () => {
    it('should route to calculateInkjet for inkjet system', () => {
      const specs = {
        size: { width: 100, height: 100 },
        resolution: '720dpi',
        media: 'glossyVinyl',
        quantity: 1,
        finishing: []
      };
      const result = PricingEngine.calculate('inkjet', 'vinylSign', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.system).toBe('inkjet');
    });
  });
});


/**
 * Unit tests for PricingEngine — Industrial Offset calculation (Task 4.5)
 */
describe('PricingEngine — Industrial Offset', () => {
  const priceTable = StorageManager.getDefaultPriceTable();

  describe('calculateIndustrialOffset — sticker', () => {
    it('should calculate sticker price with plate + print + material costs', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 4,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);

      expect(result.success).toBe(true);
      expect(result.system).toBe('industrialOffset');
      expect(result.productType).toBe('sticker');
      expect(result.quantity).toBe(5000);

      // plateCost = plateCostPerColor 300 × 4 = 1200
      // printCost: 48 ชิ้น/ใบ, ceil(5000/48)=105 ใบ + เผื่อเสีย 8% = 9 → 114 ใบ
      //            artPaper = คอนเวนชั่นนัล ตัด 4 (≤10000 ใบ) = เหมา 900/สี × 4 สี = 3600
      // ต้นทุนวัสดุ: art 90 แกรม = (90 × 32)/1e7 = 0.000288 บาท/ตร.ซม.
      // paperCost: 0.000288 × 50 × (5000 + 432 เผื่อเสีย) × 1.20 markup = 93.86496
      // total = 1200 + 3600 + 93.86496 = 4893.86496
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าเพลท', amount: 1200, conditional: false });
      expect(result.costBreakdown[1].amount).toBe(3600);
      expect(result.costBreakdown[1].label.startsWith('ค่าพิมพ์')).toBe(true);
      expect(result.costBreakdown[2].amount).toBeCloseTo(93.86496);
      expect(result.costBreakdown[2].label.startsWith('ค่าวัสดุ')).toBe(true);
      expect(result.totalPrice).toBeCloseTo(4893.86496);
      expect(result.unitPrice).toBeCloseTo(0.978773);
      expect(result.error).toBeNull();
    });

    it('should include finishing costs as separate line items', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 2000,
        finishing: ['laminate', 'dieCut']
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);

      expect(result.success).toBe(true);

      // plateCost = 300 × 2 = 600
      // printCost: 48 ชิ้น/ใบ, ceil(2000/48)=42 ใบ + เผื่อเสีย 5% = 3 → 45 ใบ, คอนเวนชั่นนัล ตัด 4 เหมา 900/สี × 2 = 1800
      // paperCost: 0.000288 × 50 × (2000 + 144 เผื่อเสีย) × 1.20 = 37.04832
      // laminate: pricePerSqCm 0.002 × 50 × 2000 = 200
      // dieCut: pricePerPiece 0.30 × 2000 = 600
      // total = 600 + 1800 + 37.04832 + 200 + 600 = 3237.04832
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าเพลท', amount: 600, conditional: false });
      expect(result.costBreakdown[1].amount).toBe(1800);
      expect(result.costBreakdown[1].label.startsWith('ค่าพิมพ์')).toBe(true);
      expect(result.costBreakdown[2].amount).toBeCloseTo(37.04832);
      expect(result.costBreakdown[2].label.startsWith('ค่าวัสดุ')).toBe(true);
      expect(result.costBreakdown[3]).toEqual({ label: 'เคลือบลามิเนต', amount: 200, conditional: true });
      expect(result.costBreakdown[4]).toEqual({ label: 'ไดคัท', amount: 600, conditional: true });
      expect(result.totalPrice).toBeCloseTo(3237.04832);
    });
  });

  describe('calculateIndustrialOffset — label', () => {
    it('should calculate label price correctly', () => {
      const specs = {
        size: { width: 8, height: 4 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 10000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('label', specs, priceTable);

      expect(result.success).toBe(true);
      // plateCost = 300 × 2 = 600
      // printCost: 8×4 บนใบ MO → 70 ชิ้น/ใบ, ceil(10000/70)=143 ใบ + เผื่อเสีย 5% = 8 → 151 ใบ, คอนเวนชั่นนัล ตัด 4 เหมา 900/สี × 2 = 1800
      // paperCost: art 90 (0.000288) × 32 × (10000 + 560 เผื่อเสีย) × 1.20 = 116.785152
      // total = 600 + 1800 + 116.785152 = 2516.785152
      expect(result.totalPrice).toBeCloseTo(2516.785152);
    });

    it('should include spotUV as area-based finishing', () => {
      const specs = {
        size: { width: 8, height: 4 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 10000,
        finishing: ['spotUV']
      };
      const result = PricingEngine.calculateIndustrialOffset('label', specs, priceTable);

      expect(result.success).toBe(true);
      // spotUV: pricePerSqCm 0.005 × 32 × 10000 = 1600
      const spotUVItem = result.costBreakdown.find(item => item.label === 'Spot UV');
      expect(spotUVItem).toBeDefined();
      expect(spotUVItem.amount).toBe(1600);
    });
  });

  describe('calculateIndustrialOffset — box', () => {
    it('should calculate box price with surface area', () => {
      const specs = {
        size: { width: 10, height: 15, depth: 5 },
        material: 'artCard',
        colorCount: 4,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('box', specs, priceTable);

      expect(result.success).toBe(true);
      // surfaceArea = 2*(10*15 + 10*5 + 15*5) = 2*(150+50+75) = 550
      // plateCost = plateCostPerColor 300 × 4 = 1200
      // printCost: tiers → 0.90/unit × qty 5000 × 4 สี = 18000
      // ต้นทุนวัสดุ artCard 310 แกรม = (310 × 34)/1e7 = 0.001054 บาท/ตร.ซม.
      // paperCost: 0.001054 × 550 × 5000 × 1.20 markup = 3478.2
      // total = 1200 + 18000 + 3478.2 = 22678.2
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าเพลท', amount: 1200, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์', amount: 18000, conditional: false });
      expect(result.costBreakdown[2].label).toBe('ค่ากระดาษ');
      expect(result.costBreakdown[2].amount).toBeCloseTo(3478.2);
      expect(result.totalPrice).toBeCloseTo(22678.2);
    });

    it('should include box finishing with area-based laminate', () => {
      const specs = {
        size: { width: 10, height: 15, depth: 5 },
        material: 'artCard',
        colorCount: 4,
        quantity: 5000,
        finishing: ['laminate', 'dieCut']
      };
      const result = PricingEngine.calculateIndustrialOffset('box', specs, priceTable);

      expect(result.success).toBe(true);
      // laminate: pricePerSqCm 0.003 × 550 × 5000 = 8250
      // dieCut: pricePerPiece 1.00 × 5000 = 5000
      const laminateItem = result.costBreakdown.find(item => item.label === 'เคลือบลามิเนต');
      const dieCutItem = result.costBreakdown.find(item => item.label === 'ไดคัท');
      expect(laminateItem.amount).toBe(8250);
      expect(dieCutItem.amount).toBe(5000);
    });
  });

  describe('calculateIndustrialOffset — brochure', () => {
    it('should calculate brochure price with sheet-based paper cost', () => {
      const specs = {
        size: { width: 21, height: 29.7 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 2000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('brochure', specs, priceTable);

      expect(result.success).toBe(true);
      // plateCost = plateCostPerColor 300 × 4 = 1200
      // printCost: tiers → 0.90/unit × qty 2000 × 4 สี = 7200
      // ต้นทุนวัสดุ art 128 แกรม = (128 × 32)/1e7 = 0.0004096 บาท/ตร.ซม.
      // pieceArea = 21 × 29.7 = 623.7
      // paperCost: 0.0004096 × 623.7 × 2000 × 1.20 markup = 613.122048
      // total = 1200 + 7200 + 613.122048 = 9013.122048
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าเพลท', amount: 1200, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์', amount: 7200, conditional: false });
      expect(result.costBreakdown[2].label).toBe('ค่ากระดาษ');
      expect(result.costBreakdown[2].amount).toBeCloseTo(613.122048);
      expect(result.totalPrice).toBeCloseTo(9013.122048);
      expect(result.unitPrice).toBeCloseTo(4.506561);
    });

    it('should include sheet-based finishing for brochure', () => {
      const specs = {
        size: { width: 21, height: 29.7 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 2000,
        finishing: ['laminate', 'spotUV']
      };
      const result = PricingEngine.calculateIndustrialOffset('brochure', specs, priceTable);

      expect(result.success).toBe(true);
      // laminate: pricePerSheet 1.00 × 2000 = 2000
      // spotUV: pricePerSheet 2.00 × 2000 = 4000
      const laminateItem = result.costBreakdown.find(item => item.label === 'เคลือบลามิเนต');
      const spotUVItem = result.costBreakdown.find(item => item.label === 'Spot UV');
      expect(laminateItem.amount).toBe(2000);
      expect(spotUVItem.amount).toBe(4000);
    });
  });

  describe('calculateIndustrialOffset — leaflet', () => {
    it('should calculate leaflet price correctly', () => {
      const specs = {
        size: { width: 21, height: 29.7 },
        material: 'artGlossy128',
        colorCount: 4,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('leaflet', specs, priceTable);

      expect(result.success).toBe(true);
      // plateCost = plateCostPerColor 300 × 4 = 1200
      // printCost: tiers → 0.90/unit × qty 5000 × 4 สี = 18000
      // ต้นทุนวัสดุ art 128 แกรม = 0.0004096 บาท/ตร.ซม., pieceArea = 21 × 29.7 = 623.7
      // paperCost: 0.0004096 × 623.7 × 5000 × 1.20 markup = 1532.80512
      // total = 1200 + 18000 + 1532.80512 = 20732.80512
      expect(result.totalPrice).toBeCloseTo(20732.80512);
    });
  });

  describe('calculateIndustrialOffset — book', () => {
    it('should calculate book price with page count and binding cost', () => {
      const specs = {
        size: { width: 14.8, height: 21 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 1000,
        finishing: [],
        pageCount: 100,
        bindingType: 'perfectBind'
      };
      const result = PricingEngine.calculateIndustrialOffset('book', specs, priceTable);

      expect(result.success).toBe(true);
      // plateCost = 2500 × 4 = 10000
      // printCost: tiers → 0.80/unit × qty 1000 × 4 สี = 3200
      // ต้นทุนวัสดุ art 128 แกรม = 0.0004096 บาท/ตร.ซม., pieceArea = 14.8 × 21 = 310.8
      // sheetCost: 0.0004096 × 310.8 × 100 หน้า × 1000 × 1.20 markup = 15276.4416
      // bindingCost: costPerPage 0.15 × 100 × 1000 = 15000 (ไม่บวก markup)
      // total paperCost = 15276.4416 + 15000 = 30276.4416
      // total = 10000 + 3200 + 30276.4416 = 43476.4416
      expect(result.costBreakdown[0]).toEqual({ label: 'ค่าเพลท', amount: 10000, conditional: false });
      expect(result.costBreakdown[1]).toEqual({ label: 'ค่าพิมพ์', amount: 3200, conditional: false });
      expect(result.costBreakdown[2].label).toBe('ค่ากระดาษ');
      expect(result.costBreakdown[2].amount).toBeCloseTo(30276.4416);
      expect(result.totalPrice).toBeCloseTo(43476.4416);
      expect(result.unitPrice).toBeCloseTo(43.476442);
    });

    it('should include per-piece finishing for book', () => {
      const specs = {
        size: { width: 14.8, height: 21 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 1000,
        finishing: ['laminate', 'spotUV'],
        pageCount: 100,
        bindingType: 'perfectBind'
      };
      const result = PricingEngine.calculateIndustrialOffset('book', specs, priceTable);

      expect(result.success).toBe(true);
      // laminate (ปก): pricePerPiece 3.00 × 1000 = 3000
      // spotUV (ปก): pricePerPiece 5.00 × 1000 = 5000
      const laminateItem = result.costBreakdown.find(item => item.label.includes('เคลือบลามิเนต'));
      const spotUVItem = result.costBreakdown.find(item => item.label.includes('Spot UV'));
      expect(laminateItem.amount).toBe(3000);
      expect(spotUVItem.amount).toBe(5000);
    });

    it('should return error when bindingType is missing for book', () => {
      const specs = {
        size: { width: 14.8, height: 21 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 1000,
        finishing: [],
        pageCount: 100,
        bindingType: 'nonexistent'
      };
      const result = PricingEngine.calculateIndustrialOffset('book', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('เข้าเล่ม');
    });

    it('should return error when pageCount is missing for book', () => {
      const specs = {
        size: { width: 14.8, height: 21 },
        material: 'artMatte128',
        colorCount: 4,
        quantity: 1000,
        finishing: [],
        pageCount: 0,
        bindingType: 'perfectBind'
      };
      const result = PricingEngine.calculateIndustrialOffset('book', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('หน้า');
    });
  });

  describe('calculateIndustrialOffset — catalog', () => {
    it('should calculate catalog price with page count and binding', () => {
      const specs = {
        size: { width: 21, height: 29.7 },
        material: 'artGlossy157',
        colorCount: 4,
        quantity: 2000,
        finishing: [],
        pageCount: 48,
        bindingType: 'saddleStitch'
      };
      const result = PricingEngine.calculateIndustrialOffset('catalog', specs, priceTable);

      expect(result.success).toBe(true);
      // plateCost = 2500 × 4 = 10000
      // printCost: tiers → 0.90/unit × qty 2000 × 4 สี = 7200
      // ต้นทุนวัสดุ art 157 แกรม = (157 × 32)/1e7 = 0.0005024 บาท/ตร.ซม., pieceArea = 21 × 29.7 = 623.7
      // sheetCost: 0.0005024 × 623.7 × 48 หน้า × 2000 × 1.20 markup = 36097.560576
      // bindingCost: costPerPage 0.10 × 48 × 2000 = 9600 (ไม่บวก markup)
      // total paperCost = 36097.560576 + 9600 = 45697.560576
      // total = 10000 + 7200 + 45697.560576 = 62897.560576
      expect(result.totalPrice).toBeCloseTo(62897.560576);
      expect(result.unitPrice).toBeCloseTo(31.44878);
    });
  });

  describe('calculateIndustrialOffset — error handling', () => {
    it('should return error for invalid product type', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('nonexistent', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for invalid material', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'nonexistent',
        colorCount: 2,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('วัสดุ');
    });

    it('should return error for invalid quantity', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 0, // จำนวนต้องมากกว่า 0
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);
      expect(result.success).toBe(false);
      expect(result.error).toContain('จำนวน');
    });

    it('should return error when priceTable is null', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, null);
      expect(result.success).toBe(false);
    });

    it('should handle empty finishing array gracefully', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);
      expect(result.success).toBe(true);
      // plate, print, material (สติกเกอร์คิดค่าพิมพ์ตามใบพิมพ์ — ไม่มี finishing)
      expect(result.costBreakdown.length).toBe(3);
    });

    it('should ignore unknown finishing options', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 5000,
        finishing: ['unknownOption']
      };
      const result = PricingEngine.calculateIndustrialOffset('sticker', specs, priceTable);
      expect(result.success).toBe(true);
      // Unknown finishing should be ignored, only 3 base items
      expect(result.costBreakdown.length).toBe(3);
    });
  });

  describe('calculateFinishingCost helper', () => {
    it('should return empty array when no options provided', () => {
      const result = PricingEngine.calculateFinishingCost([], { width: 10, height: 5 }, 1000, {}, 'sticker');
      expect(result).toEqual([]);
    });

    it('should return empty array when options is null', () => {
      const result = PricingEngine.calculateFinishingCost(null, { width: 10, height: 5 }, 1000, {}, 'sticker');
      expect(result).toEqual([]);
    });

    it('should calculate area-based finishing (pricePerSqCm)', () => {
      const rates = {
        laminate: { name: 'เคลือบลามิเนต', pricePerSqCm: 0.002 }
      };
      const result = PricingEngine.calculateFinishingCost(['laminate'], { width: 10, height: 5 }, 1000, rates, 'sticker');
      // 0.002 × 50 × 1000 = 100
      expect(result).toEqual([{ label: 'เคลือบลามิเนต', amount: 100 }]);
    });

    it('should calculate piece-based finishing (pricePerPiece)', () => {
      const rates = {
        dieCut: { name: 'ไดคัท', pricePerPiece: 0.30 }
      };
      const result = PricingEngine.calculateFinishingCost(['dieCut'], { width: 10, height: 5 }, 1000, rates, 'sticker');
      // 0.30 × 1000 = 300
      expect(result).toEqual([{ label: 'ไดคัท', amount: 300 }]);
    });

    it('should calculate sheet-based finishing (pricePerSheet)', () => {
      const rates = {
        laminate: { name: 'เคลือบลามิเนต', pricePerSheet: 1.00 }
      };
      const result = PricingEngine.calculateFinishingCost(['laminate'], { width: 21, height: 29.7 }, 2000, rates, 'brochure');
      // 1.00 × 2000 = 2000
      expect(result).toEqual([{ label: 'เคลือบลามิเนต', amount: 2000 }]);
    });

    it('should use surface area for box finishing', () => {
      const rates = {
        laminate: { name: 'เคลือบลามิเนต', pricePerSqCm: 0.003 }
      };
      const result = PricingEngine.calculateFinishingCost(['laminate'], { width: 10, height: 15, depth: 5 }, 1000, rates, 'box');
      // surfaceArea = 2*(10*15 + 10*5 + 15*5) = 550
      // 0.003 × 550 × 1000 = 1650
      expect(result.length).toBe(1);
      expect(result[0].label).toBe('เคลือบลามิเนต');
      expect(result[0].amount).toBeCloseTo(1650);
    });

    it('should return multiple finishing items', () => {
      const rates = {
        laminate: { name: 'เคลือบลามิเนต', pricePerSqCm: 0.002 },
        dieCut: { name: 'ไดคัท', pricePerPiece: 0.30 },
        emboss: { name: 'ปั๊มนูน', pricePerPiece: 0.50 }
      };
      const result = PricingEngine.calculateFinishingCost(['laminate', 'dieCut', 'emboss'], { width: 10, height: 5 }, 1000, rates, 'sticker');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ label: 'เคลือบลามิเนต', amount: 100 });
      expect(result[1]).toEqual({ label: 'ไดคัท', amount: 300 });
      expect(result[2]).toEqual({ label: 'ปั๊มนูน', amount: 500 });
    });
  });

  describe('calculate routing — industrialOffset', () => {
    it('should route to calculateIndustrialOffset for industrialOffset system', () => {
      const specs = {
        size: { width: 10, height: 5 },
        material: 'artPaper',
        colorCount: 2,
        quantity: 5000,
        finishing: []
      };
      const result = PricingEngine.calculate('industrialOffset', 'sticker', specs, priceTable);
      expect(result.success).toBe(true);
      expect(result.system).toBe('industrialOffset');
    });
  });
});

/**
 * Task 1.2 — Property test for Canonical_Orientation of MACHINE_SPECS
 *
 * Property 2: ทุก entry ใน PricingEngine.MACHINE_SPECS มี
 *   maxWidth ≥ maxHeight  AND  minWidth ≥ minHeight
 *
 * Validates: Requirements 1.2
 *
 * The domain is finite (all 13 machine entries), so the property is checked
 * exhaustively. fast-check drives the generator over the set of keys to
 * express the universal claim "for every entry ...".
 */
describe('Property 2: MACHINE_SPECS Canonical_Orientation (Validates: Requirements 1.2)', () => {
  const machineKeys = Object.keys(PricingEngine.MACHINE_SPECS);

  it('has exactly 13 machine entries', () => {
    expect(machineKeys).toHaveLength(13);
  });

  it('every entry satisfies maxWidth ≥ maxHeight AND minWidth ≥ minHeight (fast-check over all keys)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...machineKeys), (key) => {
        const m = PricingEngine.MACHINE_SPECS[key];
        expect(m.maxWidth).toBeGreaterThanOrEqual(m.maxHeight);
        expect(m.minWidth).toBeGreaterThanOrEqual(m.minHeight);
      }),
      { numRuns: machineKeys.length * 5 }
    );
  });

  it.each(machineKeys)('entry %s is in Canonical_Orientation', (key) => {
    const m = PricingEngine.MACHINE_SPECS[key];
    expect(m.maxWidth).toBeGreaterThanOrEqual(m.maxHeight);
    expect(m.minWidth).toBeGreaterThanOrEqual(m.minHeight);
  });
});


/**
 * Task 2.2 — Property test for Sheet Fit Symmetry
 *
 * Property 1: Rotating the input sheet (swapping width/height) must not change
 *   whether it fits a machine:
 *
 *   ∀ machine m, dimensions w, h:
 *     PricingEngine._sheetFitsMachine({width:w, height:h}, m).fits
 *       === PricingEngine._sheetFitsMachine({width:h, height:w}, m).fits
 *
 * This holds because _sheetFitsMachine internally checks both orientations
 * (normal + rotated 90°). Swapping w/h simply swaps the roles of the two
 * orientation checks, so `fits` (and `reason`) are invariant under rotation.
 * Only `orientation` may flip between 'normal' and 'rotated'.
 *
 * Validates: Requirements 1.2, 3.5, 4.1
 */
describe('Property 1: Sheet Fit Symmetry (Validates: Requirements 1.2, 3.5, 4.1)', () => {
  const machineKeys = Object.keys(PricingEngine.MACHINE_SPECS);

  // Generators constrained to the realistic input space: finite, positive
  // centimetre dimensions covering both sub-min and super-max ranges so the
  // property exercises fits, tooSmall, and tooLarge outcomes.
  const dimArb = fc.double({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true });
  const machineArb = fc.constantFrom(...machineKeys);

  it('fits result is invariant when width/height are swapped', () => {
    fc.assert(
      fc.property(dimArb, dimArb, machineArb, (w, h, key) => {
        const m = PricingEngine.MACHINE_SPECS[key];
        const normal = PricingEngine._sheetFitsMachine({ width: w, height: h }, m);
        const swapped = PricingEngine._sheetFitsMachine({ width: h, height: w }, m);
        expect(swapped.fits).toBe(normal.fits);
      }),
      { numRuns: 500 }
    );
  });

  it('failure reason is also invariant when width/height are swapped', () => {
    fc.assert(
      fc.property(dimArb, dimArb, machineArb, (w, h, key) => {
        const m = PricingEngine.MACHINE_SPECS[key];
        const normal = PricingEngine._sheetFitsMachine({ width: w, height: h }, m);
        const swapped = PricingEngine._sheetFitsMachine({ width: h, height: w }, m);
        expect(swapped.reason).toBe(normal.reason);
      }),
      { numRuns: 500 }
    );
  });
});


/**
 * Task 3.3 — Property tests for Spoilage minimum binding + legacy job type mapping
 *
 * Property 6: spoilageSheets ≥ profile.minSheets เสมอ
 *   The computed spoilage sheet count returned by calculatePressSheet is always
 *   at least the profile's documented minimum, because the engine computes
 *     spoilageSheets = max(ceil(minSheets × rate), profile.minSheets)
 *   and max(_, profile.minSheets) is a lower bound by definition.
 *
 * Property 8: legacy job type keys map ถูกต้องเสมอ
 *   LEGACY_JOB_TYPE_MAP maps every legacy key to the correct canonical
 *   Spoilage_Profile key, and every mapped target exists in SPOILAGE_PROFILES.
 *
 * Validates: Requirements 12.8, 12.11
 */
describe('Property 6 + 8: Spoilage minimum binding & legacy mapping (Validates: Requirements 12.8, 12.11)', () => {
  // The six canonical Spoilage_Profile keys (Req 12.1–12.6)
  const profileKeys = Object.keys(PricingEngine.SPOILAGE_PROFILES);

  // Valid sheet sizes that actually fit a press machine. '31x43' (78.74×109.22)
  // exceeds every machine's max in both orientations, so it is excluded here —
  // it would always return a tooLarge error rather than a success result.
  const fittingSheetSizes = ['25x36', '24x35'];

  // B1 machines that accept the above sheet sizes (rotated fit).
  const b1Machines = ['heidelberg_cd102', 'heidelberg_sx102', 'heidelberg_xl106', 'komori_s40'];

  it('Property 6: result spoilageSheets ≥ profile.minSheets for all valid press-sheet specs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...fittingSheetSizes),
        fc.constantFrom(...b1Machines),
        fc.constantFrom(...profileKeys),
        fc.integer({ min: 1, max: 100000 }),
        (sheetSize, pressType, jobType, quantity) => {
          const specs = {
            size: { width: 9, height: 5.5 },   // small piece — fits on every sheet
            sheetSize: sheetSize,
            quantity: quantity,
            colorCount: 4,
            jobType: jobType,
            paperType: 'artPaper',             // valid combo with gsm 128
            gsm: 128,
            pressType: pressType,
          };
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});

          // Only assert the invariant on successful calculations (Req 12.8).
          if (result.success) {
            const profile = PricingEngine.SPOILAGE_PROFILES[jobType];
            expect(result.summary.spoilageSheets).toBeGreaterThanOrEqual(profile.minSheets);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Property 6: spoilageSheets equals profile.minSheets when the minimum is binding (small quantity)', () => {
    // With quantity = 1 the raw spoilage ceil(minSheets × rate) is tiny, so the
    // profile.minSheets floor must bind for every profile.
    fc.assert(
      fc.property(fc.constantFrom(...profileKeys), (jobType) => {
        const specs = {
          size: { width: 9, height: 5.5 },
          sheetSize: '25x36',
          quantity: 1,
          colorCount: 4,
          jobType: jobType,
          paperType: 'artPaper',
          gsm: 128,
          pressType: 'heidelberg_cd102',
        };
        const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
        const profile = PricingEngine.SPOILAGE_PROFILES[jobType];
        expect(result.success).toBe(true);
        expect(result.summary.spoilageSheets).toBe(profile.minSheets);
      }),
      { numRuns: profileKeys.length * 5 }
    );
  });

  it('Property 8: every legacy job type key maps to the expected canonical profile', () => {
    const expectedMap = {
      simple: 'twoColorGeneral',
      fourColor: 'fourColorRepeat',
      newJob: 'fourColorFirst',
    };
    const legacyKeys = Object.keys(expectedMap);

    fc.assert(
      fc.property(fc.constantFrom(...legacyKeys), (legacyKey) => {
        const mapped = PricingEngine.LEGACY_JOB_TYPE_MAP[legacyKey];
        // maps to the documented canonical key (Req 12.11)
        expect(mapped).toBe(expectedMap[legacyKey]);
        // and that canonical key exists as a real Spoilage_Profile
        expect(PricingEngine.SPOILAGE_PROFILES).toHaveProperty(mapped);
      }),
      { numRuns: legacyKeys.length * 5 }
    );
  });

  it('Property 8: calculatePressSheet resolves legacy jobType to the mapped profile minimum', () => {
    const expectedMap = {
      simple: 'twoColorGeneral',
      fourColor: 'fourColorRepeat',
      newJob: 'fourColorFirst',
    };

    fc.assert(
      fc.property(fc.constantFrom(...Object.keys(expectedMap)), (legacyKey) => {
        const specs = {
          size: { width: 9, height: 5.5 },
          sheetSize: '25x36',
          quantity: 1,                       // force the profile minimum to bind
          colorCount: 4,
          jobType: legacyKey,
          paperType: 'artPaper',
          gsm: 128,
          pressType: 'heidelberg_cd102',
        };
        const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
        const canonical = expectedMap[legacyKey];
        const profile = PricingEngine.SPOILAGE_PROFILES[canonical];
        expect(result.success).toBe(true);
        expect(result.summary.spoilageProfile).toBe(canonical);
        expect(result.summary.spoilageSheets).toBe(profile.minSheets);
      }),
      { numRuns: 15 }
    );
  });
});


/**
 * Task 4.2 — Property test for the Perfecting Spoilage modifier
 *
 * Property 7: Perfecting only when method = perfector
 *   The Perfecting modifier (PERFECTING_MODIFIER_DEFAULT = 2.5%) is added to the
 *   base Spoilage_Profile rate ONLY when specs.printMethod === 'perfector'. For
 *   every other Print_Method the effective spoilage rate used in the calculation
 *   equals the base profile rate with no modifier added:
 *
 *     effectiveRate = SPOILAGE_PROFILES[jobType].rate
 *                   + (printMethod === 'perfector' ? PERFECTING_MODIFIER_DEFAULT : 0)
 *
 *   The engine surfaces this directly via result.summary.effectiveSpoilageRate
 *   (effective), result.summary.spoilageRate (base profile), and the flags
 *   result.summary.perfectingApplied / result.summary.perfectingExtra.
 *
 * Validates: Requirements 13.1, 13.3
 */
describe('Property 7: Perfecting only when method=perfector (Validates: Requirements 13.1, 13.3)', () => {
  // The six canonical Spoilage_Profile keys (Req 12.1–12.6)
  const profileKeys = Object.keys(PricingEngine.SPOILAGE_PROFILES);

  // Sheet sizes that actually fit a B1 press machine (rotated fit). '31x43'
  // exceeds every machine's max in both orientations and would always error.
  const fittingSheetSizes = ['25x36', '24x35'];

  // B1 machines that accept the above sheet sizes.
  const b1Machines = ['heidelberg_cd102', 'heidelberg_sx102', 'heidelberg_xl106', 'komori_s40'];

  // 'perfector' (triggers the modifier) plus several non-perfector methods.
  const nonPerfectorMethods = ['sheetwise', 'work-and-turn', 'work-and-tumble', 'single'];
  const allMethods = ['perfector', ...nonPerfectorMethods];

  const PERFECTING = PricingEngine.PERFECTING_MODIFIER_DEFAULT;

  const buildSpecs = (sheetSize, pressType, jobType, quantity, printMethod) => ({
    size: { width: 9, height: 5.5 },   // small piece — fits on every sheet
    sheetSize,
    quantity,
    colorCount: 4,
    jobType,
    printMethod,
    paperType: 'artPaper',             // valid combo with gsm 128
    gsm: 128,
    pressType,
  });

  it('adds the Perfecting modifier to the effective rate iff printMethod === perfector', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...fittingSheetSizes),
        fc.constantFrom(...b1Machines),
        fc.constantFrom(...profileKeys),
        fc.integer({ min: 1, max: 100000 }),
        fc.constantFrom(...allMethods),
        (sheetSize, pressType, jobType, quantity, printMethod) => {
          const specs = buildSpecs(sheetSize, pressType, jobType, quantity, printMethod);
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});

          // Only assert the invariant on successful calculations.
          if (!result.success) return;

          const baseRate = PricingEngine.SPOILAGE_PROFILES[jobType].rate;
          // The engine echoes the base profile rate untouched.
          expect(result.summary.spoilageRate).toBeCloseTo(baseRate, 10);

          if (printMethod === 'perfector') {
            // Modifier added exactly once.
            expect(result.summary.perfectingApplied).toBe(true);
            expect(result.summary.perfectingExtra).toBeCloseTo(PERFECTING, 10);
            expect(result.summary.effectiveSpoilageRate).toBeCloseTo(baseRate + PERFECTING, 10);
          } else {
            // No modifier for any other print method.
            expect(result.summary.perfectingApplied).toBe(false);
            expect(result.summary.perfectingExtra).toBe(0);
            expect(result.summary.effectiveSpoilageRate).toBeCloseTo(baseRate, 10);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('surfaces the "+ Perfecting" breakdown note only for the perfector method', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...fittingSheetSizes),
        fc.constantFrom(...b1Machines),
        fc.constantFrom(...profileKeys),
        fc.integer({ min: 1, max: 100000 }),
        fc.constantFrom(...allMethods),
        (sheetSize, pressType, jobType, quantity, printMethod) => {
          const specs = buildSpecs(sheetSize, pressType, jobType, quantity, printMethod);
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return;

          const spoilageItem = result.costBreakdown.find(item =>
            typeof item.label === 'string' && item.label.startsWith('กระดาษเสีย'));
          expect(spoilageItem).toBeDefined();

          if (printMethod === 'perfector') {
            expect(spoilageItem.label).toContain('+ Perfecting');
          } else {
            expect(spoilageItem.label).not.toContain('+ Perfecting');
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('two identical jobs differ in effective rate by exactly the modifier (perfector vs non-perfector)', () => {
    // Cross-check: holding all other inputs fixed, the perfector run's effective
    // spoilage RATE exceeds the non-perfector run's by exactly the modifier.
    // NOTE: we do NOT compare spoilageSheets across methods, because per-side /
    // work-and-turn semantics give different finished-pieces-per-sheet (nUp vs
    // nUp/2), so the resulting sheet counts (and thus rate-based spoilage) are
    // not directly comparable between methods.
    fc.assert(
      fc.property(
        fc.constantFrom(...fittingSheetSizes),
        fc.constantFrom(...b1Machines),
        fc.constantFrom(...profileKeys),
        fc.integer({ min: 1, max: 100000 }),
        fc.constantFrom(...nonPerfectorMethods),
        (sheetSize, pressType, jobType, quantity, otherMethod) => {
          const perfRes = PricingEngine.calculatePressSheet(
            'pressSheet', buildSpecs(sheetSize, pressType, jobType, quantity, 'perfector'), {});
          const baseRes = PricingEngine.calculatePressSheet(
            'pressSheet', buildSpecs(sheetSize, pressType, jobType, quantity, otherMethod), {});
          if (!perfRes.success || !baseRes.success) return;

          expect(perfRes.summary.effectiveSpoilageRate)
            .toBeCloseTo(baseRes.summary.effectiveSpoilageRate + PERFECTING, 10);
        }
      ),
      { numRuns: 300 }
    );
  });
});


/**
 * Task 7.7 — Property tests for PaperCuttingOptimizer
 *
 * Property 3: cut plan dedupe — every cut result is in Canonical_Orientation,
 *   i.e. cutWidth ≥ cutHeight for every result (Req 6.4). Dedup is by resulting
 *   piece geometry + count, so both (rows,cols) and (cols,rows) layouts are
 *   available (they produce different piece sizes and are NOT transposes).
 * Property 4: wasteCm2 ≥ 0 for every cut result.
 * Property 5: compatibleMachines is monotonic by plate size — the machine
 *   keys are sorted by plate-order index ('ตัด 8' → 'ตัด 4' → 'ตัด 2' →
 *   'ตัด 1'), i.e. the mapped indices are non-decreasing.
 *
 * The factory-sheet domain is finite (4 keys), and optimize() enumerates a
 * finite set of cut plans, so fast-check drives generators over factory keys,
 * optimizeFor modes, and target-machine subsets to express the universal claim
 * "for every cut result of every optimize() call ...".
 *
 * Validates: Requirements 6.2, 6.4, 7.1, 8.2
 */
describe('Task 7.7: PaperCuttingOptimizer properties (Validates: Requirements 6.2, 6.4, 7.1, 8.2)', () => {
  const Optimizer = PricingEngine.PaperCuttingOptimizer;
  const factoryKeys = Object.keys(Optimizer.FACTORY_SHEETS);
  const allMachineKeys = Object.keys(PricingEngine.MACHINE_SPECS);

  // Mirror the production orderOf helper in _filterCompatibleMachines exactly,
  // so monotonicity is asserted against the same ordering logic.
  const PLATE_ORDER = { 'ตัด 8': 0, 'ตัด 4': 1, 'ตัด 2': 2, 'ตัด 1': 3 };
  const orderOf = (key) => {
    const m = PricingEngine.MACHINE_SPECS[key];
    if (!m || typeof m.plateSize !== 'string') return 99;
    const match = m.plateSize.match(/ตัด\s*\d+/);
    if (!match) return 99;
    const normalized = match[0].replace(/\s+/, ' ');
    return (PLATE_ORDER[normalized] !== undefined) ? PLATE_ORDER[normalized] : 99;
  };

  // Generators constrained to the real input space of optimize():
  //   - factoryKey: one of the 4 supported factory sheets
  //   - optimizeFor: 'pieces' | 'waste' (default falls back to 'pieces')
  //   - targetMachineKeys: any subset of machine keys (empty => all machines)
  const factoryArb = fc.constantFrom(...factoryKeys);
  const optimizeForArb = fc.constantFrom('pieces', 'waste');
  const targetsArb = fc.subarray(allMachineKeys);

  it('Property 3: every cut result is in Canonical_Orientation (cutWidth ≥ cutHeight)', () => {
    fc.assert(
      fc.property(factoryArb, optimizeForArb, targetsArb, (factoryKey, optimizeFor, targets) => {
        const out = Optimizer.optimize(factoryKey, targets, optimizeFor);
        expect(out.success).toBe(true);
        for (const r of out.results) {
          expect(r.cutWidth).toBeGreaterThanOrEqual(r.cutHeight);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('Property 4: every cut result has wasteCm2 ≥ 0', () => {
    fc.assert(
      fc.property(factoryArb, optimizeForArb, targetsArb, (factoryKey, optimizeFor, targets) => {
        const out = Optimizer.optimize(factoryKey, targets, optimizeFor);
        expect(out.success).toBe(true);
        for (const r of out.results) {
          expect(r.wasteCm2).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('Property 5: compatibleMachines is monotonic by plate-size order', () => {
    fc.assert(
      fc.property(factoryArb, optimizeForArb, targetsArb, (factoryKey, optimizeFor, targets) => {
        const out = Optimizer.optimize(factoryKey, targets, optimizeFor);
        expect(out.success).toBe(true);
        for (const r of out.results) {
          const indices = r.compatibleMachines.map(orderOf);
          for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
          }
        }
      }),
      { numRuns: 300 }
    );
  });

  // Exhaustive check over the finite factory-key domain with default args,
  // complementing the generator-driven properties above.
  it.each(factoryKeys)('factory %s: all results satisfy cutWidth≥cutHeight, waste≥0, monotonic machines', (factoryKey) => {
    const out = Optimizer.optimize(factoryKey);
    expect(out.success).toBe(true);
    expect(out.results.length).toBeGreaterThan(0);
    for (const r of out.results) {
      expect(r.cutWidth).toBeGreaterThanOrEqual(r.cutHeight);
      expect(r.wasteCm2).toBeGreaterThanOrEqual(0);
      const indices = r.compatibleMachines.map(orderOf);
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
      }
    }
  });
});

/**
 * Task 7.8 — Unit tests for the four production sample cases (Req 10.1–10.4)
 *
 * These validate Requirements 10.1, 10.2, 10.3, and 10.4: the optimizer must
 * reproduce cut layouts that the production team already knows to be correct.
 *
 * Note on deduplication: cut plans are deduped by piece geometry + count, so
 * both the (rows, cols) and (cols, rows) orientations of a layout are available
 * as a single canonical Cut_Result (cutWidth ≥ cutHeight). We locate each
 * Cut_Result by its piece dimensions rather than by a specific (rows, cols).
 */
describe('Task 7.8: PaperCuttingOptimizer sample cases (Validates: Requirements 10.1–10.4)', () => {
  const Optimizer = PricingEngine.PaperCuttingOptimizer;

  // Helper: locate a Cut_Result by its piece geometry (within tolerance).
  const findCut = (factoryKey, w, h) => {
    const r = Optimizer.optimize(factoryKey, [], 'pieces');
    return r.results.find(
      (x) => Math.abs(x.cutWidth - w) < 0.6 && Math.abs(x.cutHeight - h) < 0.6
    );
  };

  it('Req 10.1: 31×43 half-cut produces 78.74×54.61 fitting B1 presses', () => {
    const cut = findCut('31x43', 78.74, 54.61);
    expect(cut).toBeDefined();
    expect(cut.cutWidth).toBeCloseTo(78.74, 1);
    expect(cut.cutHeight).toBeCloseTo(54.61, 1);
    expect(cut.compatibleMachines).toEqual(
      expect.arrayContaining([
        'heidelberg_cd102',
        'heidelberg_xl106',
        'heidelberg_sx102',
        'komori_s40',
      ])
    );
  });

  it('Req 10.2: 31×43 quarter-cut produces 54.61×39.37 fitting B2+ presses', () => {
    const cut = findCut('31x43', 54.61, 39.37);
    expect(cut).toBeDefined();
    expect(cut.cutWidth).toBeCloseTo(54.61, 1);
    expect(cut.cutHeight).toBeCloseTo(39.37, 1);
    expect(cut.compatibleMachines).toEqual(
      expect.arrayContaining([
        'heidelberg_mo',
        'heidelberg_movp',
        'heidelberg_sm74',
        'heidelberg_sx74',
        'heidelberg_cd102',
        'heidelberg_sx102',
        'heidelberg_xl106',
      ])
    );
  });

  it('Req 10.3: 24×35 (2,4) cut produces 30.48×22.23 fitting small/medium presses', () => {
    // Verified canonical geometry from the implementation is 30.48×22.23,
    // not the spec's paraphrased 29.7×21.0 — they describe the same (2,4) layout.
    const cut = findCut('24x35', 30.48, 22.23);
    expect(cut).toBeDefined();
    expect(cut.cutWidth).toBeCloseTo(30.48, 1);
    expect(cut.cutHeight).toBeCloseTo(22.23, 1);
    expect(cut.compatibleMachines).toEqual(
      expect.arrayContaining([
        'heidelberg_gto52',
        'heidelberg_mo',
        'heidelberg_movp',
        'heidelberg_sm52',
        'heidelberg_sx52',
        'heidelberg_sm74',
        'heidelberg_sx74',
      ])
    );
    // Intentionally NOT asserting 'heidelberg_cd102' here: CD102 has minWidth=48 cm,
    // so a 30.48 cm-wide piece does not fit it. The implementation correctly excludes it.
    expect(cut.compatibleMachines).not.toContain('heidelberg_cd102');
  });

  it('Req 10.4: 25×36 (3,3) cut produces 30.48×21.17 (A4) with minimal waste', () => {
    const cut = findCut('25x36', 30.48, 21.17);
    expect(cut).toBeDefined();
    expect(cut.cutWidth).toBeCloseTo(30.48, 1);
    expect(cut.cutHeight).toBeCloseTo(21.17, 1);
    expect(cut.wasteCm2).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Task 1.4 — Property test for _resolveCutSheet (Property 1)
// **Validates: Requirements 1.1, 1.2**
// ─────────────────────────────────────────────────────────────────────────
describe('_resolveCutSheet — Property 1 (cut fits machine + minimal cuts/waste)', () => {
  const FACTORY_SHEETS = PricingEngine.PaperCuttingOptimizer.FACTORY_SHEETS;
  const MACHINE_SPECS = PricingEngine.MACHINE_SPECS;
  const factoryKeys = Object.keys(FACTORY_SHEETS);
  const machineKeys = Object.keys(MACHINE_SPECS);

  it('Property 1: chosen Cut_Sheet fits the machine, has integer cutsPerParentSheet ≥ 1, valid factory, and minimal cuts (tie-break min waste)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...factoryKeys),
        fc.constantFrom(...machineKeys),
        (factoryKey, pressType) => {
          const cut = PricingEngine._resolveCutSheet(factoryKey, pressType, 'waste');
          if (cut === null) return; // no compatible cut plan — Property 1 vacuously holds

          // (a) the returned cut MUST fit the machine
          const fitRes = PricingEngine._sheetFitsMachine(
            { width: cut.cutWidth, height: cut.cutHeight },
            MACHINE_SPECS[pressType]
          );
          expect(fitRes.fits).toBe(true);

          // (b) cutsPerParentSheet is an integer ≥ 1
          expect(Number.isInteger(cut.cutsPerParentSheet)).toBe(true);
          expect(cut.cutsPerParentSheet).toBeGreaterThanOrEqual(1);

          // (c) factory has width/height/label
          expect(typeof cut.factory.width).toBe('number');
          expect(typeof cut.factory.height).toBe('number');
          expect(typeof cut.factory.label).toBe('string');
          expect(cut.factory.width).toBeGreaterThan(0);
          expect(cut.factory.height).toBeGreaterThan(0);

          // Minimal cuts (largest cut sheet) among ALL compatible cuts; tie-break: min waste.
          const res = PricingEngine.PaperCuttingOptimizer.optimize(factoryKey, [pressType], 'waste');
          expect(res.success).toBe(true);
          const compatible = res.results.filter(
            (r) => r.compatibleMachines && r.compatibleMachines.includes(pressType)
          );
          expect(compatible.length).toBeGreaterThan(0);

          const minCuts = Math.min(...compatible.map((r) => r.cutsPerSheet));
          expect(cut.cutsPerParentSheet).toBe(minCuts);

          // tie-break: among plans sharing minCuts, the winner has the minimum waste
          const minCutWaste = Math.min(
            ...compatible.filter((r) => r.cutsPerSheet === minCuts).map((r) => r.wasteCm2)
          );
          expect(cut.wasteCm2).toBeCloseTo(minCutWaste, 6);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Task 1.5 — Smoke test for material constants
// **Validates: Requirements 4.8, 4.3**
// ─────────────────────────────────────────────────────────────────────────
describe('Material constants — smoke test (Req 4.8, 4.3)', () => {
  it('STICKER_PRICE_PER_SQCM has 4 sticker keys, each a number > 0', () => {
    const t = PricingEngine.STICKER_PRICE_PER_SQCM;
    for (const key of ['pvcSticker', 'ppSticker', 'petSticker', 'paperSticker']) {
      expect(typeof t[key]).toBe('number');
      expect(t[key]).toBeGreaterThan(0);
    }
  });

  it('MATERIAL_INK_DEFAULT defaults stickers to UV (paper → conventional) and foil → uv', () => {
    const d = PricingEngine.MATERIAL_INK_DEFAULT;
    expect(d.pvcSticker).toBe('uv');
    expect(d.ppSticker).toBe('uv');
    expect(d.petSticker).toBe('uv');
    expect(d.paperSticker).toBe('conventional');
    expect(d.foil).toBe('uv');
  });

  it('_isStickerMaterial returns true for sticker materials and false for non-stickers', () => {
    expect(PricingEngine._isStickerMaterial('pvcSticker')).toBe(true);
    expect(PricingEngine._isStickerMaterial('artPaper')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Feature: offset-materials-and-cutting — Property tests for calculatePressSheet
// Tasks 2.2 (Property 2), 2.3 (Property 3), 2.4 (Property 4), 2.5 (Property 5)
// ═════════════════════════════════════════════════════════════════════════
describe('offset-materials-and-cutting — calculatePressSheet properties', () => {
  // Factory_Sheet keys recognised by both the optimizer and calculatePressSheet's sheetSizes map
  const FACTORY_KEYS = ['31x43', '25x36', '24x35', '19x25'];
  // B1/B2 machines that have compatible cut plans for every factory sheet → high success rate
  const SUCCESS_MACHINES = [
    'heidelberg_cd102',
    'heidelberg_sm74',
    'heidelberg_mo',
    'heidelberg_xl106',
  ];
  const ALL_MACHINES = Object.keys(PricingEngine.MACHINE_SPECS);

  // Imposition constants (must match calculatePressSheet defaults / imposition-layout.md)
  const GRIPPER = 1.2;
  const SIDE_LAY = 0.7;
  const BLEED = 0.6; // per axis

  // Recompute expected n-up on a Cut_Sheet exactly as the engine / steering rule do.
  function expectedNUp(cutWidth, cutHeight, pieceW, pieceH) {
    const printableW = cutWidth - GRIPPER;
    const printableH = cutHeight - SIDE_LAY;
    const fw = pieceW + BLEED;
    const fh = pieceH + BLEED;
    const normal = Math.floor(printableW / fw) * Math.floor(printableH / fh);
    const rotated = Math.floor(printableW / fh) * Math.floor(printableH / fw);
    return Math.max(normal, rotated);
  }

  // Build a valid press-sheet spec that should normally succeed
  // (small paper piece + paper material with a valid type+gsm).
  function buildSpecs(overrides) {
    return Object.assign(
      {
        size: { width: 9, height: 6 },
        sheetSize: '31x43',
        quantity: 5000,
        jobType: 'fourColorRepeat',
        printMethod: 'single',
        paperType: 'artPaper', // Paper_Material → materialBasis === 'weight'
        gsm: 128,              // valid Superkote artPaper gsm
        pressType: 'heidelberg_mo',
      },
      overrides
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Task 2.2 — Property 2: Parent_Sheet_Count relationship
  // parentSheetCount === ceil(printSheetsNeeded / cutsPerParentSheet)
  // AND parentSheetCount × cutsPerParentSheet ≥ printSheetsNeeded
  // **Validates: Requirements 1.4**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 2: parentSheetCount === ceil(totalSheets / cutsPerParentSheet) and covers all sheets (Req 1.4)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.integer({ min: 1, max: 200000 }),
        (sheetSize, pressType, width, height, quantity) => {
          const specs = buildSpecs({ sheetSize, pressType, size: { width, height }, quantity });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return; // only assert on successful calculations

          const s = result.summary;
          const printSheetsNeeded = s.totalSheets; // = minSheets + spoilage (Cut_Sheets)
          const cps = s.cutsPerParentSheet;
          const parent = s.parentSheetCount;

          expect(cps).toBeGreaterThanOrEqual(1);
          // exact ceil relationship
          expect(parent).toBe(Math.ceil(printSheetsNeeded / cps));
          // lower-bound: parents cover every required print sheet
          expect(parent * cps).toBeGreaterThanOrEqual(printSheetsNeeded);
        }
      ),
      { numRuns: 250 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 2.3 — Property 3: n-up on Cut_Sheet + finished pieces per method
  // nUp === max(normal, rotated) per imposition formula, nUp ≥ 1 on success,
  // finishedPiecesPerSheet === nUp (single/sheetwise) or floor(nUp/2) (W&T/tumble)
  // **Validates: Requirements 1.3, 1.6**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 3: nUp matches imposition formula and finishedPiecesPerSheet follows print method (Req 1.3, 1.6)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.constantFrom('single', 'sheetwise', 'work-and-turn', 'work-and-tumble'),
        (sheetSize, pressType, width, height, printMethod) => {
          const specs = buildSpecs({ sheetSize, pressType, size: { width, height }, printMethod });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return;

          const s = result.summary;
          // (a) nUp ≥ 1 on success
          expect(s.nUp).toBeGreaterThanOrEqual(1);

          // (b) nUp equals the imposition formula recomputed from the Cut_Sheet
          const expN = expectedNUp(s.cutWidth, s.cutHeight, width, height);
          expect(s.nUp).toBe(expN);

          // (c) finished pieces per sheet relationship to nUp by method
          const isWT = printMethod === 'work-and-turn' || printMethod === 'work-and-tumble';
          const expectedFinished = isWT ? Math.floor(s.nUp / 2) : s.nUp;
          expect(s.finishedPiecesPerSheet).toBe(expectedFinished);
        }
      ),
      { numRuns: 250 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 2.4 — Property 4: paper cost based on Factory parent sheet × count,
  // monotonic non-decreasing in quantity; selling price ≈ cost × 1.20
  // **Validates: Requirements 1.5, 4.1**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 4: paperCost is monotonic non-decreasing in quantity and sellingPrice ≈ cost × 1.20 (Req 1.5, 4.1)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: 1, max: 100000 }),
        (sheetSize, pressType, width, height, qa, qb) => {
          const q1 = Math.min(qa, qb);
          const q2 = Math.max(qa, qb);
          const base = { sheetSize, pressType, size: { width, height } };
          const r1 = PricingEngine.calculatePressSheet('pressSheet', buildSpecs(Object.assign({}, base, { quantity: q1 })), {});
          const r2 = PricingEngine.calculatePressSheet('pressSheet', buildSpecs(Object.assign({}, base, { quantity: q2 })), {});
          if (!r1.success || !r2.success) return;

          // artPaper is a Paper_Material → weight basis (Factory_Sheet based)
          expect(r1.summary.materialBasis).toBe('weight');
          expect(r2.summary.materialBasis).toBe('weight');

          // selling price = cost × 1.20 (markup preserved — Req 5.3)
          expect(r1.summary.paperSellingPrice).toBeCloseTo(r1.summary.paperCost * 1.20, 6);
          expect(r2.summary.paperSellingPrice).toBeCloseTo(r2.summary.paperCost * 1.20, 6);

          // monotonic non-decreasing: more quantity never costs less paper
          expect(r2.summary.paperCost).toBeGreaterThanOrEqual(r1.summary.paperCost - 1e-9);
        }
      ),
      { numRuns: 250 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 2.5 — Property 5: no usable cut/layout plan → success === false with
  // a Thai error string, and calculatePressSheet never throws.
  // **Validates: Requirements 1.7, 5.2**
  // ───────────────────────────────────────────────────────────────────────
  const THAI_CHAR = /[\u0E00-\u0E7F]/; // any Thai character

  it('Property 5a: across every factory×machine combo the engine never throws; when _resolveCutSheet is null → success:false + Thai error (Req 1.7, 5.2)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...ALL_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        (sheetSize, pressType, width, height) => {
          const specs = buildSpecs({ sheetSize, pressType, size: { width, height } });
          let result;
          // never throws (Req 5.2)
          expect(() => { result = PricingEngine.calculatePressSheet('pressSheet', specs, {}); }).not.toThrow();

          // when there is no compatible cut plan, the engine must return a Thai error (Req 1.7)
          const cut = PricingEngine._resolveCutSheet(sheetSize, pressType, 'waste');
          if (cut === null) {
            expect(result.success).toBe(false);
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            expect(THAI_CHAR.test(result.error)).toBe(true);
          }
        }
      ),
      { numRuns: 250 }
    );
  });

  it('Property 5b: an oversized piece that cannot be laid out → success:false with Thai error, no throw (Req 1.7, 5.2)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 200, max: 600, noNaN: true }),
        fc.double({ min: 200, max: 600, noNaN: true }),
        (sheetSize, pressType, width, height) => {
          // piece far larger than any Cut_Sheet → nUp ≤ 0 → graceful Thai error
          const specs = buildSpecs({ sheetSize, pressType, size: { width, height } });
          let result;
          expect(() => { result = PricingEngine.calculatePressSheet('pressSheet', specs, {}); }).not.toThrow();
          expect(result.success).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          expect(THAI_CHAR.test(result.error)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * offset-materials-and-cutting — Per-side colors plate/print cost properties
 * Tasks 3.2–3.5 → Properties 6–9
 *
 * Self-contained describe block (own helpers) appended at END of file.
 * Only asserts on successful calculations (result.success === true).
 */
describe('offset-materials-and-cutting — per-side colors (Properties 6–9)', () => {
  // Factory_Sheet keys recognised by calculatePressSheet's sheetSizes map + optimizer
  const FACTORY_KEYS = ['31x43', '25x36', '24x35'];
  // B1/B2 machines that have compatible cut plans for these factory sheets
  const SUCCESS_MACHINES = ['heidelberg_cd102', 'heidelberg_sm74', 'heidelberg_mo'];
  const METHODS = ['single', 'sheetwise', 'work-and-turn', 'work-and-tumble'];

  // Build a valid press-sheet spec that should normally succeed
  // (small paper piece + Paper_Material artPaper @128gsm → conventional ink).
  function buildSpecs(overrides) {
    return Object.assign(
      {
        size: { width: 9, height: 6 },   // small piece — fits on every Cut_Sheet
        sheetSize: '25x36',
        quantity: 5000,
        jobType: 'fourColorRepeat',
        printMethod: 'single',
        paperType: 'artPaper',           // Paper_Material → ink default 'conventional'
        gsm: 128,                        // valid artPaper gsm
        pressType: 'heidelberg_sm74',
      },
      overrides
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Task 3.2 — Property 6: Total_Plates + plateCost
  //   sides=1 → totalPlates === frontColors
  //   sides=2 → totalPlates === frontColors + backColors
  //   plateCost === platePerColor × totalPlates
  // **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 6: totalPlates by sides and plateCost === platePerColor × totalPlates (Req 3.1, 3.3, 3.4, 3.5)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.integer({ min: 1, max: 6 }),   // frontColors
        fc.integer({ min: 0, max: 6 }),   // backColors
        fc.constantFrom(1, 2),            // sides
        fc.constantFrom(...METHODS),
        (sheetSize, pressType, frontColors, backColors, sides, printMethod) => {
          const specs = buildSpecs({ sheetSize, pressType, frontColors, backColors, sides, printMethod });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return; // only assert on successful calculations

          const s = result.summary;
          // Total_Plates relationship by sides
          if (s.sides === 1) {
            expect(s.totalPlates).toBe(s.frontColors);
          } else {
            expect(s.totalPlates).toBe(s.frontColors + s.backColors);
          }
          // plateCost === platePerColor × totalPlates
          expect(s.plateCost).toBeCloseTo(s.platePerColor * s.totalPlates, 6);
        }
      ),
      { numRuns: 300 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 3.3 — Property 7: finished pieces for in-line two-sided work
  //   2-sided work-and-turn / work-and-tumble → finishedPiecesPerSheet === floor(nUp / 2)
  // **Validates: Requirements 3.5**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 7: 2-sided W&T / W&Tumble → finishedPiecesPerSheet === floor(nUp / 2) (Req 3.5)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.constantFrom('work-and-turn', 'work-and-tumble'),
        fc.integer({ min: 1, max: 6 }),   // frontColors
        fc.integer({ min: 0, max: 6 }),   // backColors
        (sheetSize, pressType, width, height, printMethod, frontColors, backColors) => {
          const specs = buildSpecs({
            sheetSize, pressType, size: { width, height },
            printMethod, sides: 2, frontColors, backColors,
          });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return;

          const s = result.summary;
          expect(s.sides).toBe(2);
          expect(s.finishedPiecesPerSheet).toBe(Math.floor(s.nUp / 2));
        }
      ),
      { numRuns: 300 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 3.4 — Property 8: total print cost follows the per-side definition
  //   pc(c) = calculatePrintCost(press.plateSize, inkType, totalSheets, c, 'single').cost
  //   single             → pc(front)
  //   sheetwise (sides 2) → pc(front) + pc(back)
  //   W&T/tumble (sides 2)→ pc(front + back)
  //   (printMethod 'single' passed to pc so the sheetwise ×2 multiplier is not double-counted)
  // **Validates: Requirements 3.6, 3.7**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 8: printCost equals the per-side print-cost definition (Req 3.6, 3.7)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.integer({ min: 1, max: 6 }),   // frontColors
        fc.integer({ min: 0, max: 6 }),   // backColors
        fc.constantFrom(1, 2),            // sides
        fc.constantFrom(...METHODS),
        (sheetSize, pressType, frontColors, backColors, sides, printMethod) => {
          const specs = buildSpecs({ sheetSize, pressType, frontColors, backColors, sides, printMethod });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return;

          const s = result.summary;
          const plateSize = PricingEngine.MACHINE_SPECS[pressType].plateSize;
          // per-side cost helper — always 'single' so we don't double the sheetwise multiplier
          const pc = (c) => PricingEngine.calculatePrintCost(plateSize, s.inkType, s.totalSheets, c, 'single').cost;

          let expected;
          if (s.sides === 1) {
            expected = pc(s.frontColors);
          } else if (s.method === 'work-and-turn' || s.method === 'work-and-tumble') {
            expected = pc(s.frontColors + s.backColors);
          } else {
            // sheetwise (2-sided): front plate set + back plate set
            expected = pc(s.frontColors) + pc(s.backColors);
          }
          expect(s.printCost).toBeCloseTo(expected, 4);
        }
      ),
      { numRuns: 300 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 3.5 — Property 9: legacy equivalence
  //   specs with only colorCount (no sides/frontColors/backColors) + printMethod 'single'
  //   give the same totalPlates / plateCost / printCost as the explicit form
  //   { sides: 1, frontColors: colorCount }.
  // **Validates: Requirements 3.8, 5.1**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 9: legacy colorCount (single) ≡ explicit { sides:1, frontColors:colorCount } (Req 3.8, 5.1)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.integer({ min: 1, max: 6 }),     // colorCount
        fc.integer({ min: 1, max: 100000 }),
        (sheetSize, pressType, width, height, colorCount, quantity) => {
          const base = { sheetSize, pressType, size: { width, height }, quantity, printMethod: 'single' };

          // legacy form: only colorCount, no per-side fields
          const legacy = PricingEngine.calculatePressSheet(
            'pressSheet', buildSpecs(Object.assign({}, base, { colorCount })), {}
          );
          // explicit per-side form
          const explicit = PricingEngine.calculatePressSheet(
            'pressSheet', buildSpecs(Object.assign({}, base, { sides: 1, frontColors: colorCount })), {}
          );
          if (!legacy.success || !explicit.success) return;

          expect(legacy.summary.totalPlates).toBe(explicit.summary.totalPlates);
          expect(legacy.summary.plateCost).toBeCloseTo(explicit.summary.plateCost, 6);
          expect(legacy.summary.printCost).toBeCloseTo(explicit.summary.printCost, 6);
          // sanity: legacy maps to 1-sided frontColors === colorCount
          expect(legacy.summary.sides).toBe(1);
          expect(legacy.summary.totalPlates).toBe(colorCount);
        }
      ),
      { numRuns: 300 }
    );
  });
});

/**
 * offset-materials-and-cutting — Sticker material properties + examples
 * Tasks 4.2 (Property 10), 4.3 (Property 11), 4.4 (Property 12), 4.5 (examples/edges)
 *
 * Self-contained describe block (own helpers) appended at END of file.
 * Only asserts on successful calculations (result.success === true) for the
 * property tests, per spec guidance.
 */
describe('offset-materials-and-cutting — sticker materials (Properties 10–12 + examples)', () => {
  // Factory_Sheet keys recognised by calculatePressSheet's sheetSizes map + optimizer
  const FACTORY_KEYS = ['31x43', '25x36', '24x35'];
  // B1/B2 machines that have compatible cut plans for these factory sheets → high success rate
  const SUCCESS_MACHINES = ['heidelberg_cd102', 'heidelberg_sm74', 'heidelberg_mo'];
  // The four sticker materials priced by area
  const STICKER_MATERIALS = ['pvcSticker', 'ppSticker', 'petSticker', 'paperSticker'];
  const THAI_CHAR = /[\u0E00-\u0E7F]/; // any Thai character

  // Build a valid sticker press-sheet spec that should normally succeed.
  // Stickers don't require gsm (materialBasis === 'area').
  function buildSpecs(overrides) {
    return Object.assign(
      {
        size: { width: 9, height: 6 },   // small piece — fits on every Cut_Sheet
        sheetSize: '25x36',
        quantity: 5000,
        jobType: 'fourColorRepeat',
        printMethod: 'single',
        paperType: 'pvcSticker',         // Sticker_Material → materialBasis === 'area'
        pressType: 'heidelberg_cd102',
        frontColors: 4,
      },
      overrides
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Task 4.2 — Property 10: sticker material cost by area + default ink
  //   materialCost (pre-markup, summary.paperCost)
  //     === STICKER_PRICE_PER_SQCM[material] × width × height × quantity
  //   paperSellingPrice ≈ paperCost × 1.20
  //   when specs.inkType not provided → summary.inkType === MATERIAL_INK_DEFAULT[material]
  //     (uv for pvc/pp/pet, conventional for paperSticker)
  // **Validates: Requirements 4.4, 4.5, 5.3**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 10: sticker materialCost === price/sqcm × area × qty, selling ×1.20, default ink by material (Req 4.4, 4.5, 5.3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.constantFrom(...STICKER_MATERIALS),
        fc.double({ min: 3, max: 15, noNaN: true }),
        fc.double({ min: 3, max: 15, noNaN: true }),
        fc.integer({ min: 100, max: 10000 }),
        (sheetSize, pressType, material, width, height, quantity) => {
          // No inkType provided → engine must apply MATERIAL_INK_DEFAULT[material].
          const specs = buildSpecs({
            sheetSize, pressType,
            paperType: material,
            size: { width, height },
            quantity,
          });
          delete specs.inkType;
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return; // only assert on successful calculations

          const s = result.summary;
          // Sticker materials are priced by area
          expect(s.materialBasis).toBe('area');

          // pre-markup material cost equals price/sqcm × area × quantity
          const expectedCost = PricingEngine.STICKER_PRICE_PER_SQCM[material] * width * height * quantity;
          expect(s.paperCost).toBeCloseTo(expectedCost, 6);

          // selling price = cost × 1.20 (Req 5.3)
          expect(s.paperSellingPrice).toBeCloseTo(s.paperCost * 1.20, 6);

          // default ink type follows the material default (uv for pvc/pp/pet, conventional for paperSticker)
          expect(s.inkType).toBe(PricingEngine.MATERIAL_INK_DEFAULT[material]);
        }
      ),
      { numRuns: 300 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 4.3 — Property 11: inkType override
  //   When specs.inkType is explicitly 'uv' or 'conventional', summary.inkType
  //   equals specs.inkType regardless of the material default.
  // **Validates: Requirements 4.6**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 11: explicit inkType override wins over material default (Req 4.6)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.constantFrom(...STICKER_MATERIALS),
        fc.constantFrom('uv', 'conventional'),
        fc.double({ min: 3, max: 15, noNaN: true }),
        fc.double({ min: 3, max: 15, noNaN: true }),
        (sheetSize, pressType, material, inkType, width, height) => {
          const specs = buildSpecs({
            sheetSize, pressType,
            paperType: material,
            size: { width, height },
            inkType,
          });
          const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
          if (!result.success) return;

          // user-provided inkType always wins, even when it differs from MATERIAL_INK_DEFAULT
          expect(result.summary.inkType).toBe(inkType);
        }
      ),
      { numRuns: 300 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 4.4 — Property 12: material does not affect fit/cut
  //   For the same geometry + press + sheetSize, changing paperType across
  //   materials (artPaper gsm128 + the 4 stickers) yields identical cut fields:
  //   success, cutWidth, cutHeight, cutsPerParentSheet (cut depends only on
  //   sheetSize + press, not the material).
  // **Validates: Requirements 4.7**
  // ───────────────────────────────────────────────────────────────────────
  it('Property 12: changing material keeps cutWidth/cutHeight/cutsPerParentSheet identical (Req 4.7)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FACTORY_KEYS),
        fc.constantFrom(...SUCCESS_MACHINES),
        fc.double({ min: 3, max: 15, noNaN: true }),
        fc.double({ min: 3, max: 15, noNaN: true }),
        fc.integer({ min: 100, max: 10000 }),
        (sheetSize, pressType, width, height, quantity) => {
          const base = { sheetSize, pressType, size: { width, height }, quantity };

          // Paper_Material reference (requires gsm) + the 4 sticker materials
          const variants = [
            buildSpecs(Object.assign({}, base, { paperType: 'artPaper', gsm: 128 })),
            ...STICKER_MATERIALS.map((m) => buildSpecs(Object.assign({}, base, { paperType: m }))),
          ];
          const results = variants.map((sp) => PricingEngine.calculatePressSheet('pressSheet', sp, {}));

          // Only compare when every material variant succeeds (cut feasibility is
          // material-independent, so they should all succeed or all fail together).
          if (!results.every((r) => r.success)) return;

          const ref = results[0].summary;
          for (const r of results) {
            expect(r.summary.cutWidth).toBeCloseTo(ref.cutWidth, 9);
            expect(r.summary.cutHeight).toBeCloseTo(ref.cutHeight, 9);
            expect(r.summary.cutsPerParentSheet).toBe(ref.cutsPerParentSheet);
            // n-up (imposition) is also material-independent for the same geometry
            expect(r.summary.nUp).toBe(ref.nUp);
          }
        }
      ),
      { numRuns: 250 }
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Task 4.5 — Example / edge unit tests (plain it(), no fast-check)
  // **Validates: Requirements 1.7, 3.8, 4.4, 5.1**
  // ───────────────────────────────────────────────────────────────────────

  // Example A — design's worked example:
  // PVC sticker, 2-sided 4/1, sheetwise, heidelberg_mo, sheetSize 31x43,
  // piece 9×5, qty 5000 → total ≈ 11,700 (plate 1,500 + paper sell 2,700 + print 7,500)
  it('Example: PVC sticker 4/1 sheetwise on MO totals ≈ 11,700 baht (Req 4.4, 5.1)', () => {
    const specs = {
      size: { width: 9, height: 5 },
      sheetSize: '31x43',
      quantity: 5000,
      jobType: 'fourColorRepeat',
      printMethod: 'sheetwise',
      sides: 2,
      frontColors: 4,
      backColors: 1,
      paperType: 'pvcSticker',
      pressType: 'heidelberg_mo',
    };
    const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
    expect(result.success).toBe(true);

    const s = result.summary;
    // Material: 0.010 × (9 × 5) × 5000 = 2,250 ; selling ×1.20 = 2,700
    expect(s.materialBasis).toBe('area');
    expect(s.paperCost).toBeCloseTo(2250, 6);
    expect(s.paperSellingPrice).toBeCloseTo(2700, 6);
    // Plate: MO legacy 300 × totalPlates(5) = 1,500
    expect(s.totalPlates).toBe(5);
    expect(s.plateCost).toBeCloseTo(1500, 6);
    // default sticker ink is UV
    expect(s.inkType).toBe('uv');
    // Print: pc(4) + pc(1) on ตัด 4 UV flat 1500/color = 6000 + 1500 = 7,500
    expect(s.printCost).toBeCloseTo(7500, 6);
    // Grand total = 1,500 + 2,700 + 7,500 = 11,700
    expect(result.totalPrice).toBeCloseTo(11700, 6);
  });

  // Edge — sticker spec missing size → graceful Thai error, no throw (Req 1.7)
  it('Edge: sticker spec missing size returns success:false with a Thai error and does not throw (Req 1.7)', () => {
    const specs = {
      // size intentionally omitted
      sheetSize: '25x36',
      quantity: 5000,
      jobType: 'fourColorRepeat',
      printMethod: 'single',
      paperType: 'pvcSticker',
      pressType: 'heidelberg_cd102',
      frontColors: 4,
    };
    let result;
    expect(() => { result = PricingEngine.calculatePressSheet('pressSheet', specs, {}); }).not.toThrow();
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
    expect(THAI_CHAR.test(result.error)).toBe(true);
  });

  // Legacy — paper artPaper, 1-sided, colorCount 4 still computes (Req 3.8, 5.1)
  it('Legacy: artPaper 1-sided colorCount 4 still computes successfully (Req 3.8, 5.1)', () => {
    const specs = {
      size: { width: 9, height: 6 },
      sheetSize: '25x36',
      quantity: 5000,
      jobType: 'fourColorRepeat',
      printMethod: 'single',
      paperType: 'artPaper',
      gsm: 128,
      colorCount: 4,   // legacy field, no per-side fields
      pressType: 'heidelberg_sm74',
    };
    const result = PricingEngine.calculatePressSheet('pressSheet', specs, {});
    expect(result.success).toBe(true);
    expect(result.summary.materialBasis).toBe('weight');
    expect(result.summary.sides).toBe(1);
    expect(result.summary.totalPlates).toBe(4);
    // paper material default ink is conventional
    expect(result.summary.inkType).toBe('conventional');
  });
});
