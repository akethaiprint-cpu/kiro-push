# คู่มือติดตั้ง Google Apps Script สำหรับ ThaiPrint

## ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. กด **+ สร้างสเปรดชีตใหม่**
3. ตั้งชื่อว่า **"ThaiPrint - Leads Database"**

## ขั้นตอนที่ 2: สร้าง Apps Script

1. ในหน้า Google Sheet กด **ส่วนขยาย → Apps Script**
2. ลบโค้ดเดิมทั้งหมดในไฟล์ `Code.gs`
3. คัดลอกโค้ดจากไฟล์ `Code.gs` ในโฟลเดอร์นี้ไปวางทั้งหมด
4. แก้ไข `CONFIG.NOTIFY_EMAIL` เป็นอีเมลที่ต้องการรับแจ้งเตือน
5. กด **บันทึก** (Ctrl+S)

## ขั้นตอนที่ 3: ทดสอบ

1. เลือกฟังก์ชัน `testSubmission` จาก dropdown
2. กด **▶ Run**
3. ครั้งแรกจะขอสิทธิ์ → กด **Review Permissions → Allow**
4. ตรวจสอบ:
   - Google Sheet ควรมีข้อมูลทดสอบ 1 แถว
   - อีเมลแจ้งเตือนควรส่งไปที่อีเมลที่ตั้งไว้

## ขั้นตอนที่ 4: Deploy เป็น Web App

1. กด **Deploy → New deployment**
2. กดไอคอนเฟือง → เลือก **Web app**
3. ตั้งค่า:
   - Description: `ThaiPrint Form API`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด **Deploy**
5. **คัดลอก URL** ที่ได้ (จะมีลักษณะ: `https://script.google.com/macros/s/xxxxx/exec`)

## ขั้นตอนที่ 5: เชื่อมต่อกับเว็บไซต์

1. เปิดไฟล์ `js/main.js`
2. หาบรรทัด:
   ```javascript
   const APPS_SCRIPT_URL = '';
   ```
3. ใส่ URL ที่คัดลอกมา:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/xxxxx/exec';
   ```
4. บันทึกไฟล์

## เสร็จสิ้น!

เมื่อลูกค้ากรอกฟอร์มบนเว็บไซต์:
1. ✅ ข้อมูลจะถูกบันทึกลง Google Sheet อัตโนมัติ
2. ✅ อีเมลแจ้งเตือนจะส่งไปที่ sales@thaiprint.co.th ทันที
3. ✅ ลูกค้าจะได้รับอีเมลตอบกลับอัตโนมัติ
4. ✅ ข้อมูลยังเก็บใน Admin Dashboard (localStorage) ด้วย

## หมายเหตุ

- Google Apps Script มีโควต้าส่งอีเมล **100 ครั้ง/วัน** (บัญชีฟรี) หรือ **1,500 ครั้ง/วัน** (Google Workspace)
- หากต้องการแก้ไขโค้ดหลัง Deploy ให้กด **Deploy → Manage deployments → แก้ไข → New version**
- ข้อมูลทั้งหมดอยู่ใน Google Sheet สามารถ export เป็น Excel/CSV ได้
