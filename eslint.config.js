import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

/**
 * Flat ESLint config — generated `dist/` ignored.
 */
export default defineConfig(
  globalIgnores(["dist/**", "node_modules/**", "output/**"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier
);
