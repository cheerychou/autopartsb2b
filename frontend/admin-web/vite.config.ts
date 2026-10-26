import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// API 目标可 env 覆写（默认 8000；宿主 8000 被占时 B1RU_API_TARGET=http://localhost:8001）
const apiTarget = process.env.B1RU_API_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5175,
    proxy: {
      "/api": apiTarget,
      "/catalog": apiTarget,
    },
  },
});
