"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuotationView from "@/components/quotation/QuotationView";
import { loadQuote, type StoredQuote } from "@/lib/quotation/storage";

export default function QuotationPage() {
  const [quote, setQuote] = useState<StoredQuote | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setQuote(loadQuote());
    setReady(true);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {ready && !quote && (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          <p>ยังไม่มีข้อมูลใบเสนอราคา</p>
          <Link
            href="/calculator"
            className="mt-3 inline-block text-blue-600 hover:underline"
          >
            ไปที่เครื่องคำนวณราคา →
          </Link>
        </div>
      )}
      {quote && <QuotationView quote={quote} />}
    </main>
  );
}
