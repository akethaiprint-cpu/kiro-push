import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintNect — คำนวณราคางานพิมพ์",
  description: "ระบบคำนวณราคาสิ่งพิมพ์ ไทยพริ้นท์ อินเตอร์กรุ๊ป",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
