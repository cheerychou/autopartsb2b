import { defineConfig } from "@playwright/test";

// B1-RU e2e（UI 级登录态业务链；UI 走查 KNW-011 的基建化）。
// 前置：外部起栈（本模式不做 webServer 托管——栈含 Django 侧，见 e2e/README.md）：
//   后端  :8001（SQLite+演示数据，B1RU_TEST_SQLITE=1 runserver 127.0.0.1:8001）
//   storefront :5174 / admin :5175（B1RU_API_TARGET=http://localhost:8001）
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // 两端共享一个后端库，串行避免数据互踩
  reporter: [["list"]],
  use: {
    actionTimeout: 10_000,
    locale: "ru-RU",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "storefront",
      testMatch: /corporate-flow\.spec\.ts/,
      use: { baseURL: "http://localhost:5174" },
    },
    {
      name: "admin",
      testMatch: /admin-fulfillment\.spec\.ts/,
      use: { baseURL: "http://localhost:5175" },
    },
  ],
});
