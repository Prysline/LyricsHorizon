import type { AlbumInfo } from '@/types/albums'
import { albumsConfig } from '@/data/albums'
import { getAllLyrics, type LyricsFile } from '@/types/lyrics'
/**
 * 獲取專輯資訊
 * @param artist 歌手/團體
 * @param albumId 專輯ID
 */
export function getAlbumInfo(artist: string, albumId: string) {
  return albumsConfig[artist]?.[albumId]
}

/**
 * 專輯排序比較函數
 * @param a 專輯 A 的資訊
 * @param b 專輯 B 的資訊
 * @returns 排序比較結果
 */
function compareAlbums(a: AlbumInfo, b: AlbumInfo): number {
  // 優先比較年份（降序：新的在前）
  const yearDiff = b.releaseYear - a.releaseYear
  if (yearDiff !== 0) { return yearDiff }

  // 年份相同時比較月份（如果有）
  if (a.releaseMonth && b.releaseMonth) {
    const monthDiff = b.releaseMonth - a.releaseMonth
    if (monthDiff !== 0) { return monthDiff }
  }

  // 年月都相同時，使用 sortOrder 作為最後的排序依據
  return a.sortOrder - b.sortOrder
}

/**
 * 獲取已排序的專輯列表
 * @param artist 歌手/團體名稱
 * @returns 排序後的專輯列表
 */
export function getArtistAlbums(artist: string) {
  const albums = albumsConfig[artist] || {}
  return Object.entries(albums)
    .sort(([, a], [, b]) => compareAlbums(a, b))
    .map(([id, info]) => ({
      id,
      ...info,
      // 生成顯示用的發行日期字串
      displayDate: info.releaseMonth
        ? `${info.releaseYear}.${String(info.releaseMonth).padStart(2, '0')}`
        : `${info.releaseYear}`,
    }))
}

/**
 * 整合專輯配置與實際歌詞檔案
 */
export async function getEnrichedAlbums(artistId: string) {
  // 1. 獲取該藝人的所有歌詞檔案
  const lyricsFiles = await getAllLyrics()

  // 過濾特定藝人的檔案
  const artistFiles = lyricsFiles
    .filter((file) => {
      return file.artistId === artistId
    })
    .reduce(
      (acc, file) => {
        const albumId = file.albumId
        const songId = file.id

        if (!albumId) { return acc }

        if (!acc[albumId]) {
          acc[albumId] = []
        }
        acc[albumId].push({
          ...file,
          id: songId,
        })

        return acc
      },
      {} as Record<string, LyricsFile[]>,
    )

  // 3. 獲取專輯配置
  const albums = albumsConfig[artistId] || {}

  // 4. 整合資料並過濾
  const enrichedAlbums = Object.entries(albums)
    .map(([albumId, info]) => ({
      id: albumId,
      ...info,
      songs: artistFiles[albumId] || [],
      hasContent: Boolean(artistFiles[albumId]?.length),
    }))
    .filter(album => album.hasContent) // 只保留有歌詞的專輯
    .sort((a, b) => {
      // 依年份降序排序
      const yearDiff = b.releaseYear - a.releaseYear
      if (yearDiff !== 0) { return yearDiff }
      return (b.releaseMonth || 0) - (a.releaseMonth || 0)
    })

  return enrichedAlbums
}
