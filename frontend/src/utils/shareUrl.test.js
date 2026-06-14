import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildAbsoluteUrl,
  buildCurrentPageShareUrl,
  buildShareableEmbedUrl,
  buildShareableVideoUrl,
} from './shareUrl.js'

const SAMPLE = '018fc2c7-f2e9-7a41-b9d7-0123456789ab'

describe('shareUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://abc.ngrok-free.app')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds absolute urls from configured ngrok origin', () => {
    expect(buildAbsoluteUrl('/watch/x')).toBe('https://abc.ngrok-free.app/watch/x')
    expect(buildAbsoluteUrl('https://other.test/path')).toBe('https://other.test/path')
  })

  it('uses share preview path for social crawlers', () => {
    const url = buildShareableVideoUrl(SAMPLE, 'creator')
    expect(url).toBe(`https://abc.ngrok-free.app/share/video/${SAMPLE}`)
  })

  it('falls back to watch url without username', () => {
    const url = buildShareableVideoUrl(SAMPLE, '')
    expect(url).toBe(`https://abc.ngrok-free.app/share/video/${SAMPLE}`)
  })

  it('builds embed url with public origin', () => {
    expect(buildShareableEmbedUrl(SAMPLE)).toBe(
      `https://abc.ngrok-free.app/embed/${SAMPLE}`,
    )
  })

  it('builds current page share url from pathname', () => {
    vi.stubGlobal('window', {
      location: {
        pathname: '/creator/video/abc',
        search: '?from=feed',
      },
    })
    expect(buildCurrentPageShareUrl()).toBe(
      'https://abc.ngrok-free.app/creator/video/abc?from=feed',
    )
  })
})
