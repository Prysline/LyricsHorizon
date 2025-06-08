import type { AllPronunciations, SeriesPronunciations } from './types'
import { arTonelicoPronounciations } from './ar-tonelico'

/**
 * 所有系列標音規則的統一管理介面
 * 
 * 系統架構說明：
 * - 各系列標音規則獨立維護，確保模組化管理
 * - 採用靜態導入機制，避免執行時載入效能損耗
 * - 支援系列特定查詢，提升標音精確度
 */
export const ALL_PRONUNCIATIONS: AllPronunciations = {
  'ar-tonelico': arTonelicoPronounciations,
  'sound-horizon': {},
  'linked-horizon': {}, // 待後續擴充
}

/**
 * 根據藝術家識別碼獲取對應的標音規則集
 * 
 * @param artistId 藝術家系列識別碼
 * @returns 對應系列的標音規則對照表，若系列不存在則返回空對象
 * 
 * 使用範例：
 * ```typescript
 * const arTonelicoRules = getPronunciationsByArtist('ar-tonelico')
 * const pronunciation = arTonelicoRules['Rrha'] // '⠀ラ'
 * ```
 */
export function getPronunciationsByArtist(artistId: string): SeriesPronunciations {
  return ALL_PRONUNCIATIONS[artistId] || {}
}

/**
 * 獲取所有已定義系列的識別碼清單
 * 
 * @returns 系列識別碼陣列
 * 
 * 應用場景：
 * - 系統初始化時的完整性檢查
 * - 管理介面的系列選項生成
 * - 除錯與維護時的系列清單查詢
 */
export function getAvailableArtistIds(): string[] {
  return Object.keys(ALL_PRONUNCIATIONS)
}

/**
 * 統計指定系列的標音規則總數
 * 
 * @param artistId 藝術家系列識別碼
 * @returns 該系列定義的標音規則數量
 * 
 * 用途：
 * - 系列完整度評估
 * - 標音覆蓋率統計
 * - 效能最佳化參考指標
 */
export function getPronunciationCount(artistId: string): number {
  const pronunciations = getPronunciationsByArtist(artistId)
  return Object.keys(pronunciations).length
}

/**
 * 檢查特定詞彙在指定系列中是否存在標音規則
 * 
 * @param artistId 藝術家系列識別碼
 * @param word 待查詢的詞彙
 * @returns 布林值，表示是否存在對應標音
 * 
 * 實際應用：
 * - 標音解析前的預檢查
 * - 動態標音建議系統
 * - 字典完整性驗證
 */
export function hasPronunciation(artistId: string, word: string): boolean {
  const pronunciations = getPronunciationsByArtist(artistId)
  return word in pronunciations
}

/**
 * 跨系列詞彙查詢功能
 * 搜尋特定詞彙在所有系列中的標音對應
 * 
 * @param word 查詢詞彙
 * @returns 包含系列識別碼與對應標音的結果陣列
 * 
 * 應用情境：
 * - 跨系列詞彙對比分析
 * - 標音一致性檢查
 * - 詞彙使用範圍分析
 */
export function searchWordAcrossSeries(word: string): Array<{
  artistId: string
  pronunciation: string
}> {
  const results: Array<{ artistId: string; pronunciation: string }> = []

  for (const [artistId, pronunciations] of Object.entries(ALL_PRONUNCIATIONS)) {
    if (word in pronunciations) {
      results.push({
        artistId,
        pronunciation: pronunciations[word]
      })
    }
  }

  return results
}