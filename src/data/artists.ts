import type { ArtistGroup, ArtistInfo } from '@/types/artist'

export const artistGroups: Record<string, ArtistGroup> = {
  'horizon-series': {
    id: 'horizon-series',
    displayName: 'Horizon Series',
    description: 'Revo 相關音樂作品',
    artistIds: ['sound-horizon', 'linked-horizon'],
    order: 1
  },
  'ar-tonelico-series': {
    id: 'ar-tonelico-series',
    displayName: 'Ar tonelico Series',
    description: 'アルトネリコ系列音樂作品',
    artistIds: ['ar-tonelico'],
    order: 2
  }
}

export const artistsConfig: Record<string, ArtistInfo> = {
  'sound-horizon': {
    id: 'sound-horizon',
    pathname: 'SoundHorizon',
    displayName: 'Sound Horizon',
    order: 1,
    groupId: 'horizon-series',
  },
  'linked-horizon': {
    id: 'linked-horizon',
    pathname: 'LinkedHorizon',
    displayName: 'Linked Horizon',
    order: 2,
    groupId: 'horizon-series',
  },
  'ar-tonelico': {
    id: 'ar-tonelico',
    pathname: 'ArTonelico',
    displayName: 'Ar tonelico',
    order: 3,
    groupId: 'ar-tonelico-series',
  },
}
