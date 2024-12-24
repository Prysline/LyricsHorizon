import type { ArtistInfo } from '@/types/artist'

export const artistsConfig: Record<string, ArtistInfo> = {
  'sound-horizon': {
    id: 'sound-horizon',
    pathname: 'SoundHorizon',
    displayName: 'Sound Horizon',
    order: 1,
  },
  'linked-horizon': {
    id: 'linked-horizon',
    pathname: 'LinkedHorizon',
    displayName: 'Linked Horizon',
    order: 2,
  },
}
