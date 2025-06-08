/**
 * 單一系列的標音規則類型
 * 保持與原有 FIXED_PRONUNCIATIONS 格式一致
 */
export type SeriesPronunciations = Record<string, string>

/**
 * 所有系列標音規則的整合類型
 * Key: 系列識別碼（artistId）
 * Value: 該系列的標音規則對應表
 */
export type AllPronunciations = Record<string, SeriesPronunciations>

/**
 * 標音配置項目介面
 * 用於單一標音規則的結構化描述
 */
export interface PronunciationEntry {
  /** 原始詞彙 */
  word: string
  /** 對應標音 */
  pronunciation: string
  /** 備註說明（可選） */
  note?: string
}