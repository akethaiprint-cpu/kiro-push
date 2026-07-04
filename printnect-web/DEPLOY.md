# การ Deploy PrintNect

PrintNect เป็นแอป **Next.js** ที่มี server (API + Prisma + DB) จึง **รันบน GitHub Pages ไม่ได้**
ต้อง deploy บนแพลตฟอร์มที่รัน Node/Next ได้ เช่น **Vercel** (แนะนำ ง่ายสุด) หรือ **Cloudflare**

> โค้ดอยู่ในโฟลเดอร์ย่อย `printnect-web/` ของ repo — ตอน import ต้องตั้ง **Root Directory = `printnect-web`**

---

## ตัวเลือก DB สำหรับ production

SQLite (ไฟล์ `dev.db`) ใช้ได้เฉพาะตอน dev ในเครื่อง — บน serverless (Vercel) ไฟล์ไม่คงอยู่/เขียนไม่ได้
production ต้องใช้ **Postgres** (แนะนำ [Neon](https://neon.tech) — ฟรี) หรือ Vercel Postgres

**ถ้ายังไม่ต่อ DB:** เครื่องคำนวณ + ใบเสนอราคายังใช้ได้ (ระบบ fallback เป็นราคา default อัตโนมัติ)
แต่ **หน้า admin (บันทึกราคา) จะยังไม่ทำงาน** จนกว่าจะต่อ Postgres

---

## Deploy บน Vercel (แนะนำ) — ทีละขั้น

### 1. เตรียม Postgres (ครั้งเดียว)
1. สมัคร [neon.tech](https://neon.tech) → สร้าง Project → คัดลอก **connection string**
   (รูปแบบ `postgresql://user:pass@host/db?sslmode=require`)

### 2. เปลี่ยน Prisma provider เป็น postgresql
แก้ `printnect-web/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"   // เดิม "sqlite"
  url      = env("DATABASE_URL")
}
```
> ถ้าอยากให้ dev ในเครื่องใช้ Postgres ตัวเดียวกัน ให้ตั้ง `DATABASE_URL` ใน `printnect-web/.env`
> เป็น connection string ของ Neon ด้วย (จะได้ตรงกับ production)
> commit การเปลี่ยนแปลงนี้ก่อน deploy

### 3. Import เข้า Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → เลือก repo `kiro-push`
2. **Root Directory:** กด Edit แล้วเลือก `printnect-web`  ← สำคัญ
3. Framework จะถูกจับเป็น **Next.js** อัตโนมัติ (ไม่ต้องแก้ Build Command —
   มี script `vercel-build` = `prisma generate && prisma db push && next build` ที่จะสร้างตารางใน DB ให้)

### 4. ตั้ง Environment Variables (ใน Vercel → Settings → Environment Variables)
| ชื่อ | ค่า |
|---|---|
| `DATABASE_URL` | connection string จาก Neon |
| `ADMIN_API_TOKEN` | ตั้งรหัสลับที่เดายาก (ใช้ยืนยันตอนบันทึกราคาในหน้า admin) |

### 5. Deploy
กด **Deploy** — เมื่อเสร็จจะได้ URL เช่น `https://printnect-xxxx.vercel.app`

### 6. (ตัวเลือก) ใส่ราคาเริ่มต้นลง DB
- วิธีง่าย: เข้า `/admin` บนเว็บที่ deploy → วาง Admin Token → กด **บันทึกเวอร์ชันใหม่**
  (จะได้ price table เวอร์ชัน 1 ใน DB)
- หรือรัน seed จากเครื่อง: ตั้ง `DATABASE_URL` เป็น Neon แล้ว `npm run db:seed`

### หน้าเว็บที่ได้
- `/` หน้าแรก · `/calculator` เครื่องคำนวณ · `/quotation` ใบเสนอราคา · `/admin` จัดการราคา
- API: `GET /api/price-table` (อ่าน, public) · `POST /api/price-table` (เขียน, ต้อง Bearer token)

---

## Deploy บน Cloudflare (ทางเลือก)
รองรับผ่าน [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) หรือ `@cloudflare/next-on-pages`
และใช้ **Cloudflare D1** (SQLite-compatible) หรือ Neon เป็น DB — ตั้งค่าซับซ้อนกว่า Vercel เล็กน้อย

---

## ⚠️ ความปลอดภัยที่ควรทำ
- **Rotate Personal Access Token:** remote git ปัจจุบันฝัง `ghp_...` ไว้ใน URL — ควรออก token ใหม่
  แล้วเก็บผ่าน git credential helper (อย่าฝังใน URL)
- `ADMIN_API_TOKEN` บน production ต้องเป็นค่าลับที่เดายาก (อย่าใช้ค่า dev)
- `.env` ไม่ถูก commit (อยู่ใน .gitignore) — ตั้งค่า secret ผ่าน dashboard ของแพลตฟอร์มเท่านั้น
- หน้า `/admin` ยังไม่มี login ระดับหน้า (การ "บันทึก" ป้องกันด้วย token ที่ API) — ควรเพิ่ม login ภายหลัง
