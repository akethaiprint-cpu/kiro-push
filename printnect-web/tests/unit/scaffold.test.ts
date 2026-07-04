import { describe, it, expect } from "vitest";

// เทสต์ยืนยันว่าโครง Vitest ทำงาน (Task 2.6) — regression baseline จริงเพิ่มใน Task 3
describe("scaffold sanity", () => {
  it("รันเทสต์ TypeScript ได้", () => {
    expect(1 + 1).toBe(2);
  });
});
