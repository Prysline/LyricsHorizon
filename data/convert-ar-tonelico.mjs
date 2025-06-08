/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

/**
 * Ar tonelico 系列歌詞轉換器
 * 專門處理 Ar tonelico 系列的漢字發音轉換
 *
 * 核心功能：
 * - 標準漢字發音轉換處理
 * - 系列特定的自訂讀音規則套用
 * - 與 Sound Horizon 系列完全隔離的轉換邏輯
 */

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

// 設定檔案路徑與配置參數
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ar tonelico 系列專用配置
const CONFIG = {
  SERIES_NAME: 'Ar tonelico Series',
  DICTIONARY_FILE: path.join(__dirname, 'dictionaries', 'ar-tonelico-series.json'),
  INPUT_DIR: path.join(__dirname, 'input_lyrics', 'ar-tonelico'),
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
 * 載入 Ar tonelico 系列專用轉換字典
 * 解析簡化後的轉換規則檔案
 *
 * @returns {Array} 轉換規則陣列
 */
function loadArTonelicoDict() {
  const dictionaryPath = CONFIG.DICTIONARY_FILE

  try {
    console.log(`📚 載入 Ar tonelico 系列字典: ${dictionaryPath}`)

    if (!fs.existsSync(dictionaryPath)) {
      console.log(`⚠️  字典檔案不存在，使用空規則集`)
      return []
    }

    const rawData = fs.readFileSync(dictionaryPath, CONFIG.ENCODING)
    const dictionary = JSON.parse(rawData)

    const customReadings = dictionary.custom_readings || []
    console.log(`   載入轉換規則: ${customReadings.length} 項`)

    return customReadings.map((entry) => ({
      original: entry.original,
      replacement: entry.replacement,
    }))
  } catch (error) {
    console.error(`❌ Ar tonelico 字典載入失敗: ${error.message}`)
    console.log(`💡 建議: 請檢查字典檔案格式`)
    return []
  }
}

/**
 * 執行安全的文字內容替換
 * 處理 Ar tonelico 系列的文字轉換需求
 *
 * @param {string} content 原始內容
 * @param {string} original 待替換的原始文字
 * @param {string} replacement 替換目標文字
 * @returns {string} 替換後的內容
 */
function performSafeReplacement(content, original, replacement) {
  try {
    const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = content.match(new RegExp(escapedOriginal, 'g'))
    const result = content.replace(new RegExp(escapedOriginal, 'g'), replacement)

    if (matches && matches.length > 0) {
      console.log(`   🔄 替換: "${original}" → "${replacement}" (${matches.length} 處)`)
    }

    return result
  } catch (error) {
    console.error(`❌ 文字替換錯誤: ${error.message}`)
    console.error(`   問題規則: ${original} → ${replacement}`)
    return content
  }
}

/**
 * Ar tonelico 系列歌詞轉換主流程
 * 執行標準漢字發音轉換作業
 */
async function convertArTonelicoLyrics() {
  console.log(`🎼 開始 ${CONFIG.SERIES_NAME} 系列歌詞轉換`)
  console.log(`📍 輸入目錄: ${CONFIG.INPUT_DIR}`)
  console.log(`📍 輸出目錄: ${CONFIG.OUTPUT_DIR}`)

  try {
    // 初始化轉換引擎
    console.log(`🔧 初始化轉換引擎...`)
    const kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    console.log(`✅ 轉換引擎已就緒`)

    // 建立目錄結構
    ensureDirectories()

    // 載入系列專用字典
    const customReadings = loadArTonelicoDict()

    // 檢查輸入檔案
    if (!fs.existsSync(CONFIG.INPUT_DIR)) {
      console.log(`📂 建立 Ar tonelico 輸入目錄: ${CONFIG.INPUT_DIR}`)
      console.log(`💡 請將 Ar tonelico 系列歌詞檔案放入此目錄`)
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

    console.log(`📋 找到 ${targetFiles.length} 個 Ar tonelico 系列檔案`)

    // 轉換作業統計
    let successCount = 0
    let errorCount = 0

    // 逐檔處理
    for (const file of targetFiles) {
      try {
        console.log(`\n🎵 處理檔案: ${file}`)

        const inputFilePath = path.join(CONFIG.INPUT_DIR, file)
        const outputFilePath = path.join(CONFIG.OUTPUT_DIR, file)

        // 讀取原始內容
        const originalContent = fs.readFileSync(inputFilePath, CONFIG.ENCODING)
        console.log(`   📖 讀取內容: ${originalContent.length} 字元`)

        // 執行基本假名轉換
        console.log(`   🔄 執行假名轉換...`)
        let convertedContent = await kuroshiro.convert(originalContent, {
          to: 'hiragana',
          mode: 'okurigana',
        })

        // 應用 Ar tonelico 系列自訂轉換規則
        console.log(`   🎯 應用 Ar tonelico 專用轉換規則...`)
        customReadings.forEach(({ original, replacement }) => {
          if (original && replacement) {
            convertedContent = performSafeReplacement(convertedContent, original, replacement)
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

    // 轉換作業完成報告
    console.log(`\n📊 ${CONFIG.SERIES_NAME} 轉換作業完成`)
    console.log(`   ✅ 成功轉換: ${successCount}`)
    console.log(`   ❌ 轉換失敗: ${errorCount}`)
    console.log(`   📂 輸出位置: ${CONFIG.OUTPUT_DIR}`)
  } catch (error) {
    console.error(`💥 Ar tonelico 轉換流程發生嚴重錯誤: ${error.message}`)
    console.error(`🔍 詳細錯誤資訊:`, error)
  }
}

// 執行 Ar tonelico 系列轉換作業
convertArTonelicoLyrics().catch((err) => {
  console.error('🚨 Ar tonelico 轉換器執行失敗:', err)
  process.exit(1)
})
