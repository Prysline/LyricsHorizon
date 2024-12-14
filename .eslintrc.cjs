module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended",
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  rules: {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
  },
};
