import { describe, expect, it } from "vitest";

describe("S0 admin smoke", () => {
  it("应用骨架可导入", async () => {
    const mod = await import("./App");
    expect(mod.default).toBeTruthy();
  });
});
