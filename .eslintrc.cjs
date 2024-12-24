module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
    'plugin:prettier/recommended', // 新增 Prettier 整合
    'prettier', // 禁用與 Prettier 衝突的 ESLint 規則
  ],
  plugins: [
    '@typescript-eslint',
    'prettier',
    'import', // 新增 import 外掛
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'semi': ['error', 'always'],
    'quote-props': ['error', 'consistent-as-needed'],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // 明確指定 Prettier 配置
    'prettier/prettier': [
      'error',
      {
        semi: true,
        singleQuote: true,
        quoteProps: 'as-needed',
        trailingComma: 'es5',
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
      },
    ],
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'semi', // 多行介面使用分號
          requireLast: true, // 最後一個成員也需要分號
        },
        singleline: {
          delimiter: 'semi', // 單行介面也使用分號
          requireLast: false, // 單行可省略最後的分號
        },
      },
    ],
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      },
    ],
  },
}
