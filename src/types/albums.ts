/**
 * 專輯基礎類型
 */
export type AlbumBaseType =
  | 'Story CD'
  | 'Story Maxi'
  | 'Pleasure CD'
  | 'Concept Story CD'
  | 'Anniversary Maxi'
  | 'Prologue Maxi'
  | 'Major Debut Album'
  | 'Beyond Story Maxi'

/**
 * 專輯資訊介面
 */
export interface AlbumInfo {
  /**
   * 基礎類型（可選）
   * 某些特殊專輯可能沒有明確類型
   */
  baseType?: AlbumBaseType

  /** 序號（可選） */
  order?: {
    value: number
    display: string
  }

  /** 完整標題 */
  title: string
  subTitle?: string // 用於顯示標音或副標題
  displayTitle?: string // 用於自定義顯示格式

  /** 排序權重 */
  sortOrder: number

  /**
   * 是否在側邊欄顯示類型
   * 用於控制顯示行為
   */
  showTypeInNav?: boolean

  /**
   * 發行年份
   * 用於排序和顯示
   */
  releaseYear: number

  /**
   * 發行月份（可選）
   * 若同年發行則可用於更精確的排序
   */
  releaseMonth?: number
}

/**
 * 獲取用於顯示的專輯類型文字
 * @returns 類型文字，若無類型則返回空字串
 */
export function getDisplayAlbumType(info: AlbumInfo): string {
  if (!info.baseType || !info.showTypeInNav) {
    return ''
  }

  const orderText = (info.order != null) ? `${info.order.display} ` : ''
  return `${orderText}${info.baseType}`
}
