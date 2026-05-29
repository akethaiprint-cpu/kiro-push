/**
 * ThaiPrint - Google Apps Script
 * รับข้อมูลจากฟอร์มเว็บไซต์ บันทึกลง Google Sheet + ส่ง Email แจ้งเตือน
 *
 * วิธีติดตั้ง:
 * 1. ไปที่ https://script.google.com → สร้างโปรเจกต์ใหม่
 * 2. คัดลอกโค้ดนี้ไปวาง
 * 3. แก้ไข CONFIG ด้านล่าง
 * 4. กด Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. คัดลอก URL ที่ได้ไปใส่ในไฟล์ js/main.js (ตัวแปร APPS_SCRIPT_URL)
 */

// ============ CONFIG - แก้ไขตรงนี้ ============
const CONFIG = {
  // อีเมลที่จะรับแจ้งเตือนเมื่อมีผู้ติดต่อใหม่ (ใส่ได้หลายอีเมล คั่นด้วย ,)
  NOTIFY_EMAIL: 'sales@thaiprint.co.th',

  // ชื่อ Sheet (tab) ที่จะเก็บข้อมูล
  SHEET_NAME: 'Leads',

  // ชื่อบริษัทสำหรับแสดงในอีเมล
  COMPANY_NAME: 'บริษัท ไทยพริ้นท์ อินเตอร์กรุ๊ป จำกัด',
};
// ============================================

/**
 * จัดการ GET request (ทดสอบว่า script ทำงาน)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'ThaiPrint API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * จัดการ POST request จากฟอร์มเว็บไซต์
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // บันทึกลง Google Sheet
    saveToSheet(data);

    // ส่ง Email แจ้งเตือน
    sendNotificationEmail(data);

    // ส่ง Auto-reply ให้ลูกค้า
    sendAutoReply(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Data saved and notification sent' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึกข้อมูลลง Google Sheet
 */
function saveToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // สร้าง Sheet ใหม่ถ้ายังไม่มี พร้อม Header
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Timestamp',
      'ชื่อ',
      'บริษัท',
      'อีเมล',
      'โทรศัพท์',
      'ประเภท',
      'รายละเอียด',
      'สถานะ',
    ]);
    // จัดรูปแบบ Header
    const headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0a1628');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    // ปรับความกว้างคอลัมน์
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 130);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 300);
    sheet.setColumnWidth(8, 120);
  }

  // แปลงประเภทการติดต่อเป็นภาษาไทย
  const typeLabels = {
    interested: 'สนใจบริการ',
    quote: 'สอบถามราคา',
    issue: 'แจ้งปัญหา',
    partner: 'ร่วมงานกับเรา',
  };

  // เพิ่มแถวข้อมูล
  sheet.appendRow([
    new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    data.name || '',
    data.company || '-',
    data.email || '',
    data.phone || '',
    typeLabels[data.type] || data.type || '',
    data.message || '-',
    'รอดำเนินการ',
  ]);
}

/**
 * ส่ง Email แจ้งเตือนแอดมิน
 */
function sendNotificationEmail(data) {
  const typeLabels = {
    interested: 'สนใจบริการ',
    quote: 'สอบถามราคา',
    issue: 'แจ้งปัญหา',
    partner: 'ร่วมงานกับเรา',
  };

  const typeThai = typeLabels[data.type] || data.type;
  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const subject = '[ThaiPrint] ผู้ติดต่อใหม่ - ' + typeThai + ' - ' + data.name;

  const htmlBody = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#3d8bfd;margin:0;font-size:20px;">🔔 ผู้ติดต่อใหม่จากเว็บไซต์</h1>
        <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">${CONFIG.COMPANY_NAME}</p>
      </div>
      <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:120px;font-size:14px;">ประเภท</td>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px;">
              <span style="background:#0066ff;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;">${typeThai}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">ชื่อ</td>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">บริษัท</td>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">${data.company || '-'}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">อีเมล</td>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;"><a href="mailto:${data.email}" style="color:#0066ff;">${data.email}</a></td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">โทรศัพท์</td>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;"><a href="tel:${data.phone}" style="color:#0066ff;">${data.phone}</a></td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:#64748b;font-size:14px;vertical-align:top;">รายละเอียด</td>
            <td style="padding:12px 0;font-size:14px;">${data.message || '-'}</td>
          </tr>
        </table>
      </div>
      <div style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">ได้รับเมื่อ: ${timestamp} | ข้อมูลถูกบันทึกลง Google Sheet แล้ว</p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: subject,
    htmlBody: htmlBody,
  });
}

/**
 * ส่ง Auto-reply ให้ลูกค้า
 */
function sendAutoReply(data) {
  if (!data.email) return;

  const subject = 'ขอบคุณที่ติดต่อ ' + CONFIG.COMPANY_NAME;

  const htmlBody = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#3d8bfd;margin:0;font-size:22px;">ThaiPrint</h1>
        <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">${CONFIG.COMPANY_NAME}</p>
      </div>
      <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
        <h2 style="color:#0a1628;margin:0 0 16px;font-size:18px;">ขอบคุณที่ติดต่อเรา คุณ${data.name}</h2>
        <p style="color:#475569;line-height:1.8;font-size:14px;">
          เราได้รับข้อมูลของท่านเรียบร้อยแล้ว ทีมงานจะตรวจสอบและติดต่อกลับภายใน <strong>24 ชั่วโมง</strong> ในวันทำการ
        </p>
        <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;">หากต้องการติดต่อด่วน:</p>
          <p style="margin:0;font-size:14px;">📞 <a href="tel:021494518" style="color:#0066ff;">02-149-4518</a> | <a href="tel:0817707544" style="color:#0066ff;">081-770-7544</a></p>
          <p style="margin:4px 0 0;font-size:14px;">📧 <a href="mailto:sales@thaiprint.co.th" style="color:#0066ff;">sales@thaiprint.co.th</a></p>
        </div>
        <p style="color:#475569;line-height:1.8;font-size:14px;">
          ขอบคุณที่ไว้วางใจ ThaiPrint<br>
          <em>"งานพิมพ์มีคุณภาพ บริการประทับใจ ก้าวไกลสู่มาตรฐานสากล"</em>
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">
          ${CONFIG.COMPANY_NAME}<br>
          16/5 หมู่ 9 ถ.จันทร์ทองเอี่ยม ต.บางแม่นาง อ.บางใหญ่ จ.นนทบุรี 11140
        </p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    replyTo: CONFIG.NOTIFY_EMAIL,
  });
}

/**
 * ฟังก์ชันทดสอบ - รันจาก Editor เพื่อทดสอบ
 */
function testSubmission() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        name: 'ทดสอบ ระบบ',
        company: 'บริษัททดสอบ จำกัด',
        email: 'sales@thaiprint.co.th',
        phone: '081-770-7544',
        type: 'quote',
        message: 'ทดสอบระบบฟอร์ม - สนใจสอบถามราคาสติ๊กเกอร์ PVC 1,000 ดวง',
      }),
    },
  };
  const result = doPost(testData);
  Logger.log(result.getContent());
}
