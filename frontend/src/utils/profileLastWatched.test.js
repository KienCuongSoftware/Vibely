import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadProfileLastWatched,
  recordProfileLastWatchedFromVideo,
  saveProfileLastWatched,
  profileLastWatchedStorageKey,
} from './profileLastWatched.js'

const SAMPLE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

describe('profileLastWatched', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('normalizes username for storage key', () => {
    expect(profileLastWatchedStorageKey('@Alice')).toBe('alice')
  })

  it('round-trips public id and tab context', () => {
    saveProfileLastWatched('bob', SAMPLE_ID, {
      tab: 'favorites',
      favoritesSubTab: 'posts',
    })
    expect(loadProfileLastWatched('bob')).toEqual({
      publicId: SAMPLE_ID,
      tab: 'favorites',
      favoritesSubTab: 'posts',
    })
  })

  it('reads legacy plain id string', () => {
    sessionStorage.setItem('vibely.profile.lastWatched.carol', SAMPLE_ID)
    expect(loadProfileLastWatched('carol')).toEqual({
      publicId: SAMPLE_ID,
      tab: 'videos',
      favoritesSubTab: 'posts',
    })
  })

  it('records from feed video author', () => {
    recordProfileLastWatchedFromVideo({
      authorUsername: '@Creator',
      publicId: SAMPLE_ID,
    })
    expect(loadProfileLastWatched('creator')).toEqual({
      publicId: SAMPLE_ID,
      tab: 'videos',
      favoritesSubTab: 'posts',
    })
  })
})
