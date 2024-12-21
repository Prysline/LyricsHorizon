import { soundHorizonAlbums } from './sound-horizon';
// import { linkedHorizonAlbums } from './linked-horizon';
import type { AlbumInfo } from '@/types/albums';

export const albumsConfig: Record<string, Record<string, AlbumInfo>> = {
  'sound-horizon': soundHorizonAlbums,
  // 'linked-horizon': linkedHorizonAlbums
};