import path from 'node:path'
import { getArtistByPathname } from '@/lib/artists'

/**
 * 歌詞元素的類型列舉
 * 定義了歌詞中可能出現的不同內容形式
 */
export type LyricsElementType = 'text' | 'html' | 'furigana' | 'special'

/**
 * 基礎歌詞元素介面
 * 描述了歌詞中最基本的內容單位
 */
export interface LyricsElement {
  /** 元素類型 */
  type: LyricsElementType
  /** 主要內容 */
  content: string
  /** 假名標註（用於日文歌詞） */
  furigana?: string
}

/**
 * 歌詞元資料介面
 * 描述了歌曲的基本資訊
 */
export interface LyricsMeta {
  /** 歌曲標題 */
  title: string
  /** 演唱者 */
  vocal?: string
  /** 專輯名稱 */
  album?: string
}

/**
 * 已解析的歌詞元素
 * 用於解析過程中的中間狀態
 */
export interface ParsedLyricsElement extends LyricsElement {
  /** 標記是否經過修改 */
  isModified?: boolean
}

/**
 * 包含樣式的歌詞元素
 * 用於最終的展示渲染
 */
export interface StyledLyricsElement extends LyricsElement {
  /** CSS 樣式對象 */
  style?: Record<string, string>
}

/**
 * 完整的歌詞文件結構
 */
export interface LyricsDocument {
  /** 歌曲元資料 */
  meta: LyricsMeta
  /** 前言文字（選用） */
  prologueText?: string[]
  /** 分段的歌詞內容 */
  segments: StyledLyricsElement[][]
}

/**
 * 解析後的歌詞文件
 */
export interface ParsedLyricsDocument {
  /** 歌曲元資料 */
  meta: LyricsMeta
  /** 已解析的內容 */
  content: ParsedLyricsElement[][]
}

// 1. 定義原始檔案介面
export interface RawLyricsFile {
  file: string
  frontmatter: {
    title: string
    vocal?: string
    album?: string
  }
  rawContent: () => string
}

export function getLyricsFileName(file: RawLyricsFile): string {
  return path.basename(file.file, path.extname(file.file))
}

// 2. 定義應用程式使用的介面
export interface LyricsFile {
  id: string // 檔案識別碼
  artistId: string // 歌手/團體
  albumId: string // 專輯
  filepath: string // 檔案路徑
  meta: {
    // 重新命名且擴展的元資料
    title: string
    vocal?: string
    album?: string
  }
  content: () => string // 重新命名的內容獲取函數
}

// 3. 建立轉換函數
export function transformLyricsFile(raw: RawLyricsFile): LyricsFile {
  const pathSegments = raw.file.split('/')
  const pathArtist = pathSegments.at(-3)

  if (!pathArtist) {
    throw new Error(`Invalid file path structure: ${raw.file}`)
  }

  // 將檔案路徑中的藝術家名稱轉換為系統識別碼
  const artistInfo = getArtistByPathname(pathArtist)
  if (!artistInfo) {
    throw new Error(`Unknown artist: ${pathArtist}`)
  }

  return {
    id: getLyricsFileName(raw),
    artistId: artistInfo.id,
    albumId: pathSegments.at(-2) ?? '',
    filepath: raw.file,
    meta: { ...raw.frontmatter },
    content: raw.rawContent,
  }
}

// 4. 更新獲取函數
export async function getAllLyrics(): Promise<LyricsFile[]> {
  const rawFiles = (await Object.values(
    import.meta.glob('@/data/lyrics/**/*.md', { eager: true }),
  )) as RawLyricsFile[]

  return rawFiles.map(transformLyricsFile)
}
