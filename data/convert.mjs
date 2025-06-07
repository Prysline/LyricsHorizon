/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */
import path from "path"
import { fileURLToPath } from "url"
import fs from "node:fs"
import Kuroshiro from "kuroshiro"
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji"

// 設定檔案路徑
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 輸入和輸出目錄
const inputDir = path.join(__dirname, "input_lyrics")
const outputDir = path.join(__dirname, "output_lyrics")

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

// 載入自定義讀音字典
function loadCustomDictionary() {
  const dictionaryPath = path.resolve(__dirname, "lyrics-dictionary.json")
  try {
    const rawData = fs.readFileSync(dictionaryPath, "utf8")
    const dictionary = JSON.parse(rawData)
    return dictionary.custom_readings.map((entry) => ({
      original: entry.original,
      replacement: entry.replacement,
    }))
  } catch (error) {
    console.error("載入自訂讀音字典失敗:", error)
    return []
  }
}

function safeReplace(content, original, replacement) {
  try {
    // 安全轉義特殊正則字元
    const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // console.log("原始內容:", content);
    console.log("匹配模式:", escapedOriginal)
    console.log("替換內容:", replacement)

    return content.replace(new RegExp(escapedOriginal, "g"), replacement)
  } catch (error) {
    console.error("替換時發生錯誤:", error)
    return content
  }
}

async function convertLyrics() {
  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer())

  // 載入自定義讀音映射
  const customReadings = loadCustomDictionary()

  // 讀取輸入目錄中的所有 .md 文件
  const files = fs.readdirSync(inputDir).filter((file) => file.endsWith(".md"))

  for (const file of files) {
    const inputFilePath = path.join(inputDir, file)
    const outputFilePath = path.join(outputDir, file)

    // 讀取文件內容
    const content = fs.readFileSync(inputFilePath, "utf8")

    // 將內容轉換為送假名
    let convertedContent = await kuroshiro.convert(content, {
      to: "hiragana",
      mode: "okurigana",
    })

    // 後處理：替換特殊讀音
    customReadings.forEach(({ original, replacement }) => {
      if (original && replacement) {
        convertedContent = safeReplace(convertedContent, original, replacement)
      }
    })

    // 寫入轉換後的內容
    fs.writeFileSync(outputFilePath, convertedContent, "utf8")

    console.log(`Converted and saved: ${file}`)
  }

  console.log("All files have been converted successfully!")
}

convertLyrics().catch((err) => console.error("Error:", err))
