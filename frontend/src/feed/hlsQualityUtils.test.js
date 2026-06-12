import { describe, expect, it } from 'vitest'
import {
  applyStreamQuality,
  findLevelIndexByHeight,
  getAvailableQualitiesFromLevels,
} from './hlsQualityUtils.js'

describe('hlsQualityUtils', () => {
  it('reads 540p and 720p from HLS levels', () => {
    expect(
      getAvailableQualitiesFromLevels([
        { height: 540 },
        { height: 720 },
      ]),
    ).toEqual(['auto', '540', '720'])
  })

  it('offers 540p when source is below 720 but has a 540 rendition', () => {
    expect(
      getAvailableQualitiesFromLevels([{ height: 576 }, { height: 540 }]),
    ).toEqual(['auto', '540'])
  })

  it('hides unavailable quality options', () => {
    expect(getAvailableQualitiesFromLevels([{ height: 540 }])).toEqual([
      'auto',
      '540',
    ])
    expect(getAvailableQualitiesFromLevels([{ height: 720 }])).toEqual([
      'auto',
      '720',
    ])
    expect(getAvailableQualitiesFromLevels([])).toEqual(['auto'])
  })

  it('switches hls.currentLevel for auto and fixed renditions', () => {
    const hls = {
      levels: [{ height: 540 }, { height: 720 }],
      currentLevel: 0,
    }

    applyStreamQuality(hls, 'auto')
    expect(hls.currentLevel).toBe(-1)

    applyStreamQuality(hls, '540')
    expect(hls.currentLevel).toBe(0)

    applyStreamQuality(hls, '720')
    expect(hls.currentLevel).toBe(1)
  })

  it('falls back to auto when requested level is missing', () => {
    const hls = {
      levels: [{ height: 540 }],
      currentLevel: 0,
    }

    const ok = applyStreamQuality(hls, '720')
    expect(ok).toBe(false)
    expect(hls.currentLevel).toBe(-1)
  })

  it('matches near heights from manifest metadata', () => {
    expect(findLevelIndexByHeight([{ height: 544 }], 540)).toBe(0)
  })
})
