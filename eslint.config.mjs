import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  ignores: [
    '**/*.md', // 排除所有 Markdown 檔案
  ],
})
