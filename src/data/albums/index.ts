// import { linkedHorizonAlbums } from './linked-horizon';
import type { AlbumInfo } from '@/types/albums'
import { soundHorizonAlbums } from './sound-horizon'
import { arTonelicoAlbums } from './ar-tonelico'

export const albumsConfig: Record<string, Record<string, AlbumInfo>> = {
  'sound-horizon': soundHorizonAlbums,
  'ar-tonelico': arTonelicoAlbums,
  // 'linked-horizon': linkedHorizonAlbums
}
