export interface ArtistGroup {
  /** 分組識別碼 */
  id: string
  /** 分組顯示名稱 */
  displayName: string
  /** 分組描述（可選） */
  description?: string
  /** 分組排序權重 */
  order: number
  /** 所屬藝術家ID列表 */
  artistIds: string[]
}

export interface ArtistInfo {
  /** 系統識別碼（用於內部邏輯） */
  id: string
  /** 檔案系統路徑（用於路由和檔案存取） */
  pathname: string
  /** 顯示名稱（用於 UI 顯示） */
  displayName: string
  /** 排序權重（可選） */
  order?: number
  /** 所屬分組ID（可選） */
  groupId?: string
}
