import type { ArtistInfo } from '@/types/artist'
import { artistsConfig } from '@/data/artists'

export function getArtistById(id: string): ArtistInfo | undefined {
  return artistsConfig[id]
}

export function getArtistByPathname(pathname: string): ArtistInfo | undefined {
  return Object.values(artistsConfig).find(artist => artist.pathname === pathname)
}

export function normalizeArtistPath(path: string): string {
  const artist = getArtistByPathname(path)
  return artist?.id ?? path.toLowerCase()
}
