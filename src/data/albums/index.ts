// import { linkedHorizonAlbums } from './linked-horizon';
import type { AlbumInfo } from '@/types/albums'
import { soundHorizonAlbums } from './sound-horizon'

export const albumsConfig: Record<string, Record<string, AlbumInfo>> = {
  'sound-horizon': soundHorizonAlbums,
  // 'linked-horizon': linkedHorizonAlbums
}
