import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    files: ["jest.config.js", "scripts/*.js"],
    rules: {
      // Allow CommonJS imports
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // This project doesn't use React Compiler (no `experimental.reactCompiler`
    // in next.config.ts), so eslint-plugin-react-hooks's compiler-readiness
    // rules don't apply — they'd otherwise flag the standard fetch-on-mount
    // effect pattern used throughout this app.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
]);

export default eslintConfig;
