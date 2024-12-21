export interface ArtistInfo {
  /** 系統識別碼（用於內部邏輯） */
  id: string;
  /** 檔案系統路徑（用於路由和檔案存取） */
  pathname: string;
  /** 顯示名稱（用於 UI 顯示） */
  displayName: string;
  /** 排序權重（可選） */
  order?: number;
}
