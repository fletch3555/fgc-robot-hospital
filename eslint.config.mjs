import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts"
    ],
  },
  // {
  //   files: ["**/*.d.ts"],
  //   rules: {
  //     // Turn off @typescript-eslint/no-unused-vars specifically for .d.ts files
  //     "@typescript-eslint/no-unused-vars": "off"
  //   }
  // },
  // {
  //   files: ["**/*.ts", "**/*.tsx"],
  //   rules: {
  //     // Allow any types in form handlers and API routes for now
  //     // TODO: Replace with proper types in future iterations
  //     "@typescript-eslint/no-explicit-any": "warn"
  //   }
  // },
  {
    files: ["jest.config.js"],
    rules: {
      // Allow CommonJS imports
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default eslintConfig;
