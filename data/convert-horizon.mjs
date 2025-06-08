/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

/**
 * Sound Horizon / Linked Horizon 系列歌詞轉換器
 * 專門處理 Horizon 系列的特殊讀音轉換需求
 *
 * 功能特點：
 * - 獨立的字典載入機制，避免與其他系列混合
 * - 針對 Horizon 系列的詩意表達進行最佳化
 * - 支援 Revo 創作風格的特殊語言處理
 */

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

// 設定檔案路徑
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Horizon 系列專用目錄配置
const CONFIG = {
  SERIES_NAME: 'Sound Horizon / Linked Horizon',
  DICTIONARY_FILE: path.join(__dirname, 'dictionaries', 'horizon-series.json'),
  INPUT_DIR: path.join(__dirname, 'input_lyrics', 'horizon'),
  OUTPUT_DIR: path.join(__dirname, 'output_lyrics'),
  SUPPORTED_EXTENSIONS: ['.md'],
  ENCODING: 'utf8',
}

/**
 * 確保目錄結構存在
 * 為轉換作業建立必要的資料夾結構
 */
function ensureDirectories() {
  const directories = [CONFIG.INPUT_DIR, CONFIG.OUTPUT_DIR]

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`📁 已建立目錄: ${dir}`)
    }
  })
}

/**
 * 載入 Horizon 系列專用字典
 * 解析簡化後的轉換規則檔案
 *
 * @returns {Array} 轉換規則陣列
 */
function loadHorizonDictionary() {
  const dictionaryPath = CONFIG.DICTIONARY_FILE

  try {
    console.log(`📖 載入 Horizon 系列字典: ${dictionaryPath}`)
    const rawData = fs.readFileSync(dictionaryPath, CONFIG.ENCODING)
    const dictionary = JSON.parse(rawData)

    const customReadings = dictionary.custom_readings || []
    console.log(`   載入轉換規則: ${customReadings.length} 項`)

    return customReadings.map((entry) => ({
      original: entry.original,
      replacement: entry.replacement,
    }))
  } catch (error) {
    console.error(`❌ 載入 Horizon 字典失敗: ${error.message}`)
    console.log(`💡 提示: 請確認 ${dictionaryPath} 檔案存在且格式正確`)
    return []
  }
}

/**
 * 安全的文字替換函數
 * 處理正規表達式特殊字元的轉義
 *
 * @param {string} content 原始內容
 * @param {string} original 待替換文字
 * @param {string} replacement 替換文字
 * @returns {string} 替換後的內容
 */
function safeReplace(content, original, replacement) {
  try {
    // 轉義正規表達式特殊字元
    const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // 執行全域替換
    const result = content.replace(new RegExp(escapedOriginal, 'g'), replacement)

    // 記錄替換統計
    const matchCount = (content.match(new RegExp(escapedOriginal, 'g')) || []).length
    if (matchCount > 0) {
      console.log(`   🔄 替換 "${original}" → "${replacement}" (${matchCount} 處)`)
    }

    return result
  } catch (error) {
    console.error(`❌ 文字替換錯誤: ${error.message}`)
    console.error(`   原始: ${original}`)
    console.error(`   替換: ${replacement}`)
    return content
  }
}

/**
 * 主要轉換流程
 * 執行 Horizon 系列歌詞的假名轉換作業
 */
async function convertHorizonLyrics() {
  console.log(`🎵 開始 ${CONFIG.SERIES_NAME} 系列歌詞轉換`)
  console.log(`📍 輸入目錄: ${CONFIG.INPUT_DIR}`)
  console.log(`📍 輸出目錄: ${CONFIG.OUTPUT_DIR}`)

  try {
    // 初始化 Kuroshiro 假名轉換引擎
    console.log(`🔧 初始化 Kuroshiro 轉換引擎...`)
    const kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    console.log(`✅ Kuroshiro 引擎已就緒`)

    // 確保目錄結構
    ensureDirectories()

    // 載入系列特定字典
    const customReadings = loadHorizonDictionary()

    // 掃描輸入檔案
    if (!fs.existsSync(CONFIG.INPUT_DIR)) {
      console.log(`⚠️  輸入目錄不存在: ${CONFIG.INPUT_DIR}`)
      console.log(`💡 請將 Horizon 系列歌詞檔案放入此目錄後重新執行`)
      return
    }

    const allFiles = fs.readdirSync(CONFIG.INPUT_DIR)
    const targetFiles = allFiles.filter((file) =>
      CONFIG.SUPPORTED_EXTENSIONS.some((ext) => file.endsWith(ext))
    )

    if (targetFiles.length === 0) {
      console.log(`📝 在 ${CONFIG.INPUT_DIR} 中未找到可轉換的檔案`)
      console.log(`🔍 支援的檔案格式: ${CONFIG.SUPPORTED_EXTENSIONS.join(', ')}`)
      return
    }

    console.log(`📋 找到 ${targetFiles.length} 個待轉換檔案`)

    // 逐一處理檔案
    let successCount = 0
    let errorCount = 0

    for (const file of targetFiles) {
      try {
        console.log(`\n🔄 處理檔案: ${file}`)

        const inputFilePath = path.join(CONFIG.INPUT_DIR, file)
        const outputFilePath = path.join(CONFIG.OUTPUT_DIR, file)

        // 讀取原始內容
        const originalContent = fs.readFileSync(inputFilePath, CONFIG.ENCODING)
        console.log(`   📖 已讀取 ${originalContent.length} 字元`)

        // 執行 Kuroshiro 假名轉換
        console.log(`   🔄 執行假名轉換...`)
        let convertedContent = await kuroshiro.convert(originalContent, {
          to: 'hiragana',
          mode: 'okurigana',
        })

        // 應用 Horizon 系列特定的自訂讀音
        console.log(`   🎯 應用 Horizon 系列自訂讀音...`)
        customReadings.forEach(({ original, replacement }) => {
          if (original && replacement) {
            convertedContent = safeReplace(convertedContent, original, replacement)
          }
        })

        // 輸出轉換結果
        fs.writeFileSync(outputFilePath, convertedContent, CONFIG.ENCODING)
        console.log(`   ✅ 轉換完成: ${outputFilePath}`)

        successCount++
      } catch (error) {
        console.error(`   ❌ 檔案轉換失敗: ${error.message}`)
        errorCount++
      }
    }

    // 轉換作業總結
    console.log(`\n📊 ${CONFIG.SERIES_NAME} 轉換作業完成`)
    console.log(`   ✅ 成功: ${successCount} 個檔案`)
    if (errorCount > 0) {
      console.log(`   ❌ 失敗: ${errorCount} 個檔案`)
    }
    console.log(`   📁 輸出位置: ${CONFIG.OUTPUT_DIR}`)
  } catch (error) {
    console.error(`💥 轉換流程發生嚴重錯誤: ${error.message}`)
    console.error(`🔍 詳細錯誤資訊:`, error)
  }
}

// 執行轉換作業
convertHorizonLyrics().catch((err) => {
  console.error('🚨 轉換器執行失敗:', err)
  process.exit(1)
})
