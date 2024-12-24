import type { AlbumInfo } from '@/types/albums'

export const soundHorizonAlbums: Record<string, AlbumInfo> = {
  emafull: {
    baseType: 'Story CD',
    order: {
      value: 7.5,
      display: '7.5th',
    },
    title: '絵馬に願ひを！(Full Edition)',
    sortOrder: 76,
    showTypeInNav: true,
    releaseYear: 2023,
    releaseMonth: 6,
  },
  vanistar: {
    baseType: 'Anniversary Maxi',
    title: '{{いずれ滅びゆく星の煌めき:ヴァニシング·スターライト}}',
    sortOrder: 72,
    showTypeInNav: true,
    releaseYear: 2014,
    releaseMonth: 10,
  },
  hallow: {
    baseType: 'Story Maxi',
    title: 'ハロウィンと夜の物語',
    sortOrder: 71,
    showTypeInNav: true,
    releaseYear: 2013,
    releaseMonth: 10,
  },
}
