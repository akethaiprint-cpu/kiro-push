/**
 * Quotation Printer
 * จัดการการพิมพ์ใบเสนอราคา
 * Module Pattern (object literal) for browser, also export for Vitest testing
 */
const QuotationPrinter = {
  /**
   * เปิด print dialog พร้อม formatted quotation
   * สร้าง iframe ซ่อนใน document, ใส่ HTML แล้วเรียก print
   * @param {CalculationResult} result - ผลคำนวณจาก PricingEngine
   * @param {object} specs - Print specifications (size, material, colorCount, quantity, etc.)
   */
  print(result, specs) {
    if (!result || !result.success) {
      return;
    }

    const html = this.generatePrintHTML(result, specs);

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = iframeDoc.document || iframeDoc;
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to load then trigger print
    iframe.onload = function () {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        // Fallback: open in new window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
      // Clean up iframe after a delay
      setTimeout(function () {
        document.body.removeChild(iframe);
      }, 1000);
    };
  },

  /**
   * สร้าง HTML สำหรับ print — formatted A4 quotation
   * @param {CalculationResult} result - ผลคำนวณ
   * @param {object} specs - Print specifications
   * @returns {string} Complete HTML document string
   */
  generatePrintHTML(result, specs) {
    const today = this.formatThaiDate(new Date());
    const formatCurrency = typeof PricingEngine !== 'undefined' && PricingEngine.formatCurrency
      ? PricingEngine.formatCurrency.bind(PricingEngine)
      : function (amount) { return '฿' + amount.toFixed(2); };

    // Map system keys to Thai names
    const systemNames = {
      screen: 'ซิลค์สกรีน',
      digitalOffset: 'ดิจิทัล Offset',
      industrialOffset: 'Offset อุตสาหกรรม',
      inkjet: 'อิงค์เจ็ท'
    };

    // Map product type keys to Thai names
    const productTypeNames = {
      sticker: 'สติกเกอร์',
      box: 'กล่อง',
      fabricBag: 'ถุงผ้า',
      label: 'ฉลากสินค้า',
      boxSmall: 'กล่องจำนวนน้อย',
      businessCard: 'นามบัตร',
      brochure: 'โบรชัวร์',
      leaflet: 'แผ่นพับ',
      book: 'หนังสือ',
      catalog: 'แคตตาล็อก',
      vinylSign: 'ป้ายไวนิล',
      largeSticker: 'สติกเกอร์ขนาดใหญ่',
      banner: 'แบนเนอร์',
      poster: 'โปสเตอร์'
    };

    const systemName = systemNames[result.system] || result.system;
    const productTypeName = productTypeNames[result.productType] || result.productType;

    // Build size string
    let sizeStr = '';
    if (specs && specs.size) {
      if (specs.size.depth) {
        sizeStr = specs.size.width + ' x ' + specs.size.height + ' x ' + specs.size.depth + ' ซม.';
      } else {
        sizeStr = specs.size.width + ' x ' + specs.size.height + ' ซม.';
      }
    }

    // Build material string
    const materialStr = specs && specs.material ? specs.material : '-';

    // Build color count string
    const colorCountStr = specs && specs.colorCount ? specs.colorCount + ' สี' : '-';

    // Build quantity string
    const quantityStr = result.quantity ? result.quantity.toLocaleString() + ' ชิ้น' : '-';

    // Build cost breakdown rows
    let costRows = '';
    if (result.costBreakdown && result.costBreakdown.length > 0) {
      for (var i = 0; i < result.costBreakdown.length; i++) {
        var item = result.costBreakdown[i];
        if (item.conditional && item.amount <= 0) continue;
        costRows += '<tr><td style="padding: 6px 8px; border-bottom: 1px solid #eee;">' +
          item.label + '</td><td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">' +
          formatCurrency(item.amount) + '</td></tr>';
      }
    }

    var html = '<!DOCTYPE html>' +
      '<html lang="th">' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>ใบเสนอราคา - บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด</title>' +
      '<style>' +
      '@page { size: A4 portrait; margin: 10mm; }' +
      '* { margin: 0; padding: 0; box-sizing: border-box; }' +
      'body { font-family: "Sarabun", "Noto Sans Thai", sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 10mm; }' +
      '.header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }' +
      '.company-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }' +
      '.company-address { font-size: 12px; color: #555; margin-bottom: 2px; }' +
      '.company-phone { font-size: 12px; color: #555; }' +
      '.title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }' +
      '.date { text-align: right; margin-bottom: 15px; font-size: 13px; }' +
      '.specs-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
      '.specs-table th { text-align: left; padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; width: 35%; font-weight: bold; }' +
      '.specs-table td { padding: 6px 8px; border: 1px solid #ddd; }' +
      '.cost-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
      '.cost-table th { text-align: left; padding: 8px; background: #f5f5f5; border: 1px solid #ddd; }' +
      '.cost-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }' +
      '.total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333 !important; }' +
      '.unit-price-row { color: #555; }' +
      '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }' +
      '@media print { body { padding: 0; } }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="header">' +
      '<div class="company-name">บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด</div>' +
      '<div class="company-address">16/5 หมู่ 9 ถ.จันทร์ทองเอี่ยม ต.บางแม่นาง อ.บางใหญ่ จ.นนทบุรี 11140</div>' +
      '<div class="company-phone">โทร. 02-149-4518, 081-770-7544</div>' +
      '</div>' +
      '<div class="title">ใบเสนอราคา</div>' +
      '<div class="date">วันที่: ' + today + '</div>' +
      '<table class="specs-table">' +
      '<tr><th>ระบบพิมพ์</th><td>' + systemName + '</td></tr>' +
      '<tr><th>ประเภทสินค้า</th><td>' + productTypeName + '</td></tr>' +
      '<tr><th>ขนาด</th><td>' + sizeStr + '</td></tr>' +
      '<tr><th>วัสดุ</th><td>' + materialStr + '</td></tr>' +
      '<tr><th>จำนวนสี</th><td>' + colorCountStr + '</td></tr>' +
      '<tr><th>จำนวน</th><td>' + quantityStr + '</td></tr>' +
      '</table>' +
      '<table class="cost-table">' +
      '<thead><tr><th style="width: 60%;">รายการ</th><th style="width: 40%; text-align: right;">จำนวนเงิน</th></tr></thead>' +
      '<tbody>' +
      costRows +
      '<tr class="total-row"><td style="padding: 8px; border-top: 2px solid #333;">ราคารวม</td><td style="padding: 8px; border-top: 2px solid #333; text-align: right;">' + formatCurrency(result.totalPrice) + '</td></tr>' +
      '<tr class="unit-price-row"><td style="padding: 6px 8px;">ราคาต่อหน่วย</td><td style="padding: 6px 8px; text-align: right;">' + formatCurrency(result.unitPrice) + '</td></tr>' +
      '</tbody>' +
      '</table>' +
      '<div class="footer">' +
      '<p>เอกสารนี้จัดทำโดยระบบคำนวณราคาอัตโนมัติ — ราคาอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งล่วงหน้า</p>' +
      '</div>' +
      '</body>' +
      '</html>';

    return html;
  },

  /**
   * Format วันที่เป็น DD/MM/YYYY พ.ศ. (Buddhist Era)
   * @param {Date} date - JavaScript Date object
   * @returns {string} Formatted date string e.g. "15/06/2568"
   */
  formatThaiDate(date) {
    var day = date.getDate();
    var month = date.getMonth() + 1; // getMonth() is 0-indexed
    var year = date.getFullYear() + 543; // Convert to Buddhist Era

    var dd = day < 10 ? '0' + day : '' + day;
    var mm = month < 10 ? '0' + month : '' + month;
    var yyyy = '' + year;

    return dd + '/' + mm + '/' + yyyy;
  }
};

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuotationPrinter;
}
