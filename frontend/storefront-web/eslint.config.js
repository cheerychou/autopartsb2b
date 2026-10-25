// S0 最小 flat config（TS parser + 0 规则占位）；b1-eslint-config 规则集接入随 S1（31号 H5 收尾）
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "src/generated/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.base],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
);
