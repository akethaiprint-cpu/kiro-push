import { PrismaClient } from "@prisma/client";

// ป้องกันการสร้าง PrismaClient หลายตัวตอน hot-reload ใน dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
