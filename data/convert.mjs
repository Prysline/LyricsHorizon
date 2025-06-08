/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

/**
 * 歌詞轉換系統主要控制器
 * 提供系列化轉換功能的統一管理介面
 *
 * 系統架構：
 * - 支援多系列獨立轉換處理
 * - 維持向後相容性
 * - 提供批次處理與選擇性轉換選項
 * - 統一的錯誤處理與進度回報機制
 */

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import { spawn } from 'child_process'

// 系統配置與路徑設定
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 轉換系統配置
const CONVERTER_CONFIG = {
  AVAILABLE_SERIES: {
    'horizon': {
      name: 'Sound Horizon / Linked Horizon',
      script: 'convert-horizon.mjs',
      description: 'Sound Horizon 與 Linked Horizon 系列歌詞轉換',
    },
    'ar-tonelico': {
      name: 'Ar tonelico Series',
      script: 'convert-ar-tonelico.mjs',
      description: 'Ar tonelico 系列歌詞轉換',
    },
  },
}

/**
 * 顯示系統資訊與可用選項
 * 為使用者提供完整的系統功能概覽
 */
function displaySystemInfo() {
  console.log(`🎵 歌詞轉換系統 v2.0`)
  console.log(`📊 系列化轉換架構`)
  console.log(``)

  console.log(`🎯 可用的轉換系列:`)
  Object.entries(CONVERTER_CONFIG.AVAILABLE_SERIES).forEach(([key, config]) => {
    const scriptExists = fs.existsSync(path.join(__dirname, config.script))
    const status = scriptExists ? '✅' : '⚠️ '

    console.log(`   ${status} ${key}: ${config.name}`)
    console.log(`      描述: ${config.description}`)
    console.log(`      轉換器: ${config.script}`)
    console.log(``)
  })

  console.log(`📋 使用方式:`)
  console.log(`   node convert.mjs [系列名稱]`)
  console.log(`   node convert.mjs horizon     # 轉換 Sound Horizon 系列`)
  console.log(`   node convert.mjs ar-tonelico # 轉換 Ar tonelico 系列`)
  console.log(`   node convert.mjs --all       # 轉換所有系列`)
  console.log(`   node convert.mjs --help      # 顯示此說明`)
  console.log(``)
}

/**
 * 執行指定系列的轉換作業
 * 調用對應的系列特定轉換器並管理執行流程
 *
 * @param {string} seriesKey 系列識別碼
 * @returns {Promise<boolean>} 轉換作業是否成功完成
 */
function executeSeriesConverter(seriesKey) {
  return new Promise((resolve, reject) => {
    const seriesConfig = CONVERTER_CONFIG.AVAILABLE_SERIES[seriesKey]

    if (!seriesConfig) {
      console.error(`❌ 未知的系列: ${seriesKey}`)
      console.log(`💡 可用系列: ${Object.keys(CONVERTER_CONFIG.AVAILABLE_SERIES).join(', ')}`)
      resolve(false)
      return
    }

    const scriptPath = path.join(__dirname, seriesConfig.script)

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ 轉換器腳本不存在: ${scriptPath}`)
      resolve(false)
      return
    }

    console.log(`🚀 啟動 ${seriesConfig.name} 轉換器`)
    console.log(`📜 執行腳本: ${seriesConfig.script}`)
    console.log(`${'='.repeat(60)}`)

    // 使用子程序執行系列特定轉換器
    const childProcess = spawn('node', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
    })

    childProcess.on('close', (code) => {
      console.log(`${'='.repeat(60)}`)
      if (code === 0) {
        console.log(`✅ ${seriesConfig.name} 轉換作業完成`)
        resolve(true)
      } else {
        console.error(`❌ ${seriesConfig.name} 轉換作業失敗 (退出碼: ${code})`)
        resolve(false)
      }
    })

    childProcess.on('error', (error) => {
      console.error(`💥 執行 ${seriesConfig.name} 轉換器時發生錯誤:`, error.message)
      reject(error)
    })
  })
}

/**
 * 執行所有系列的批次轉換作業
 * 依序處理各個系列，提供完整的批次轉換功能
 *
 * @returns {Promise<Object>} 包含各系列轉換結果的統計物件
 */
async function executeAllSeries() {
  console.log(`🔄 開始批次轉換作業 - 處理所有可用系列`)
  console.log(``)

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    details: {},
  }

  for (const [seriesKey, seriesConfig] of Object.entries(CONVERTER_CONFIG.AVAILABLE_SERIES)) {
    results.total++

    try {
      console.log(`\n📂 第 ${results.total} 個系列: ${seriesConfig.name}`)
      const success = await executeSeriesConverter(seriesKey)

      if (success) {
        results.success++
        results.details[seriesKey] = 'success'
      } else {
        results.failed++
        results.details[seriesKey] = 'failed'
      }
    } catch (error) {
      results.failed++
      results.details[seriesKey] = `error: ${error.message}`
      console.error(`💥 ${seriesConfig.name} 轉換過程發生異常:`, error.message)
    }

    // 在系列之間添加間隔，便於閱讀
    if (results.total < Object.keys(CONVERTER_CONFIG.AVAILABLE_SERIES).length) {
      console.log(`\n${'─'.repeat(40)}`)
    }
  }

  return results
}

/**
 * 舊版相容模式處理
 * 為了維持向後相容性而保留的轉換邏輯
 */
async function handleLegacyMode() {
  if (!CONVERTER_CONFIG.LEGACY_MODE.enabled) {
    console.log(`🚫 舊版相容模式已停用`)
    return false
  }

  console.log(CONVERTER_CONFIG.LEGACY_MODE.warning_message)
  console.log(`🔄 使用預設系列進行轉換: ${CONVERTER_CONFIG.LEGACY_MODE.default_series}`)
  console.log(`💡 建議改用: node convert.mjs ${CONVERTER_CONFIG.LEGACY_MODE.default_series}`)
  console.log(``)

  return await executeSeriesConverter(CONVERTER_CONFIG.LEGACY_MODE.default_series)
}

/**
 * 主要轉換控制邏輯
 * 解析命令列參數並執行對應的轉換作業
 */
async function main() {
  const args = process.argv.slice(2)

  // 處理說明請求
  if (args.includes('--help') || args.includes('-h')) {
    displaySystemInfo()
    return
  }

  // 處理批次轉換請求
  if (args.includes('--all') || args.includes('-a')) {
    const results = await executeAllSeries()

    console.log(`\n📊 批次轉換作業總結:`)
    console.log(`   🎯 處理系列數: ${results.total}`)
    console.log(`   ✅ 成功完成: ${results.success}`)
    console.log(`   ❌ 轉換失敗: ${results.failed}`)

    if (results.failed > 0) {
      console.log(`\n📋 詳細結果:`)
      Object.entries(results.details).forEach(([series, status]) => {
        const icon = status === 'success' ? '✅' : '❌'
        console.log(`   ${icon} ${series}: ${status}`)
      })
    }

    return
  }

  // 處理系列特定轉換請求
  if (args.length > 0) {
    const seriesKey = args[0].toLowerCase()

    if (Object.keys(CONVERTER_CONFIG.AVAILABLE_SERIES).includes(seriesKey)) {
      await executeSeriesConverter(seriesKey)
    } else {
      console.error(`❌ 不支援的系列: ${seriesKey}`)
      console.log(``)
      displaySystemInfo()
    }
    return
  }

  // 無參數時的處理：提供操作選項
  if (args.length === 0) {
    console.log(`🤔 未指定轉換系列`)
    console.log(``)
    displaySystemInfo()

    // 若啟用舊版相容模式，提供預設轉換
    if (CONVERTER_CONFIG.LEGACY_MODE.enabled) {
      console.log(`⚡ 5 秒後將自動啟用舊版相容模式...`)
      console.log(`💡 按 Ctrl+C 取消，或直接指定系列名稱`)

      await new Promise((resolve) => setTimeout(resolve, 5000))
      await handleLegacyMode()
    }
  }
}

// 執行主要控制邏輯
main().catch((error) => {
  console.error('🚨 轉換系統發生嚴重錯誤:', error.message)
  console.error('🔍 完整錯誤資訊:', error)
  process.exit(1)
})
