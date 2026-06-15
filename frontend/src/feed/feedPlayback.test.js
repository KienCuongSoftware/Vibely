import { describe, expect, it } from 'vitest'
import { isHlsPlaybackUrl, resolveFeedPlaybackUrl } from './feedPlayback.js'

describe('feedPlayback', () => {
  it('prefers HLS master over progressive MP4', () => {
    expect(
      resolveFeedPlaybackUrl({
        videoUrl: 'https://cdn.example.com/v/1/source.mp4',
        masterPlaylistUrl: 'https://cdn.example.com/v/1/playlist.m3u8',
      }),
    ).toBe('https://cdn.example.com/v/1/playlist.m3u8')
  })

  it('falls back to progressive when HLS is missing', () => {
    expect(
      resolveFeedPlaybackUrl({
        videoUrl: 'https://cdn.example.com/v/1/source.mp4',
        masterPlaylistUrl: null,
      }),
    ).toBe('https://cdn.example.com/v/1/source.mp4')
  })

  it('detects HLS URLs', () => {
    expect(isHlsPlaybackUrl('https://cdn.example.com/v/1/playlist.m3u8')).toBe(true)
    expect(isHlsPlaybackUrl('https://cdn.example.com/v/1/source.mp4')).toBe(false)
  })
})
