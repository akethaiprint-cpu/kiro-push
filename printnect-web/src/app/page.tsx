import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">ThaiPrintNect</h1>
      <p className="mt-3 text-gray-600">
        ระบบคำนวณราคางานพิมพ์ ไทยพริ้นท์ อินเตอร์กรุ๊ป (เวอร์ชัน Next.js)
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/calculator"
          className="rounded bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          เข้าเครื่องคำนวณราคา
        </Link>
        <Link
          href="/admin"
          className="rounded border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          จัดการราคา (Admin)
        </Link>
      </div>
    </main>
  );
}
