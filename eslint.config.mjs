// eslint.config.mjs
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from "@stylistic/eslint-plugin"
import parser from "@typescript-eslint/parser"

export default tseslint.config(
  eslint.configs.recommended,
  {
    plugins: {
      "@stylistic": stylistic,
      "@typescript-eslint": tseslint.plugin,
    },
    ignores: [
      "**/*.md", // 排除所有 Markdown 檔案
      "data/convert.cjs",
      ".astro/*",
    ],
    rules: {
      "semi": ["error", "never"],
      "quote-props": ["error", "consistent-as-needed"],
      "max-statements-per-line": ["error", { max: 2 }],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
)