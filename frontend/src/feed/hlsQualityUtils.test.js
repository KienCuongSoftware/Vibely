import { describe, expect, it } from 'vitest'
import {
  applyStreamQuality,
  findLevelIndexByHeight,
  formatQualityLabel,
  getAvailableQualitiesFromLevels,
  getAvailableQualitiesFromMasterPlaylist,
  getAvailableQualitiesFromSourceHeight,
  sortQualityOptions,
} from './hlsQualityUtils.js'

describe('hlsQualityUtils', () => {
  it('parses standard heights from master playlist text', () => {
    const text = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=404x720',
      '720p/playlist.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=304x540',
      '540p/playlist.m3u8',
    ].join('\n')
    expect(getAvailableQualitiesFromMasterPlaylist(text)).toEqual([
      'auto',
      '720',
      '540',
    ])
  })

  it('reads standard and 4K heights from HLS levels', () => {
    expect(
      getAvailableQualitiesFromLevels([
        { height: 540 },
        { height: 720 },
        { height: 1080 },
        { height: 2160 },
      ]),
    ).toEqual(['auto', '2160', '1080', '720', '540'])
  })

  it('dedupes near-standard heights for menu labels', () => {
    expect(
      getAvailableQualitiesFromLevels([{ height: 576 }, { height: 540 }]),
    ).toEqual(['auto', '576'])
  })

  it('hides unavailable quality options', () => {
    expect(getAvailableQualitiesFromLevels([{ height: 540 }])).toEqual([
      'auto',
      '540',
    ])
    expect(getAvailableQualitiesFromLevels([])).toEqual(['auto'])
  })

  it('maps source height for progressive playback', () => {
    expect(getAvailableQualitiesFromSourceHeight(2160)).toEqual(['auto', '2160'])
    expect(getAvailableQualitiesFromSourceHeight(0)).toEqual(['auto'])
  })

  it('formats labels including 4K', () => {
    expect(formatQualityLabel('auto')).toBe('Tự động')
    expect(formatQualityLabel('2160')).toBe('4K')
    expect(formatQualityLabel('1080')).toBe('1080P')
    expect(formatQualityLabel('720')).toBe('720P')
    expect(formatQualityLabel('540')).toBe('540P')
    expect(formatQualityLabel('576')).toBe('540P')
  })

  it('sorts quality options with highest first after auto', () => {
    expect(sortQualityOptions(['720', 'auto', '2160', '1080'])).toEqual([
      'auto',
      '2160',
      '1080',
      '720',
    ])
  })

  it('switches hls.currentLevel for auto and fixed renditions', () => {
    const hls = {
      levels: [{ height: 540 }, { height: 720 }, { height: 2160 }],
      currentLevel: 0,
    }

    applyStreamQuality(hls, 'auto')
    expect(hls.currentLevel).toBe(-1)

    applyStreamQuality(hls, '540')
    expect(hls.currentLevel).toBe(0)

    applyStreamQuality(hls, '2160')
    expect(hls.currentLevel).toBe(2)
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
