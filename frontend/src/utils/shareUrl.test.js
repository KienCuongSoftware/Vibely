import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appendShareTracking,
  buildAbsoluteUrl,
  buildCurrentPageShareUrl,
  buildShareableEmbedUrl,
  buildShareableProfileUrl,
  buildShareableVideoUrl,
  normalizeShareMethod,
  resolveShareDevice,
  resolveShareSenderDevice,
  resolveShareSource,
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
    const url = buildShareableVideoUrl(SAMPLE, 'creator', { device: 'pc', shareMethod: 'copy_link' })
    expect(url).toBe(
      `https://abc.ngrok-free.app/share/video/${SAMPLE}?source=web&device=pc&share_method=copy_link`,
    )
  })

  it('falls back to watch url without username', () => {
    const url = buildShareableVideoUrl(SAMPLE, { device: 'pc' })
    expect(url).toBe(
      `https://abc.ngrok-free.app/share/video/${SAMPLE}?source=web&device=pc`,
    )
  })

  it('builds embed url with public origin', () => {
    expect(buildShareableEmbedUrl(SAMPLE)).toBe(
      `https://abc.ngrok-free.app/embed/${SAMPLE}`,
    )
  })

  it('resolves share source and device', () => {
    expect(resolveShareSource()).toBe('web')
    expect(resolveShareSource({ source: 'android' })).toBe('android')
    expect(resolveShareSource({ source: 'ios' })).toBe('ios')
    expect(resolveShareDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe('pc')
    expect(
      resolveShareDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      }),
    ).toBe('mobile')
    expect(resolveShareDevice({ userAgentData: { mobile: true }, userAgent: '' })).toBe(
      'mobile',
    )
    expect(resolveShareSenderDevice({ userAgentData: { mobile: false }, userAgent: '' })).toBe(
      'pc',
    )
  })

  it('normalizes share_method aliases', () => {
    expect(normalizeShareMethod('copy')).toBe('copy_link')
    expect(normalizeShareMethod('twitter')).toBe('x')
    expect(normalizeShareMethod('facebook')).toBe('facebook')
  })

  it('builds profile share url with source/device/share_method', () => {
    expect(
      buildShareableProfileUrl('dulichmoingay_', {
        device: 'pc',
        shareMethod: 'copy_link',
      }),
    ).toBe(
      'https://abc.ngrok-free.app/@dulichmoingay_?source=web&device=pc&share_method=copy_link',
    )
    expect(
      buildShareableProfileUrl('@Creator', {
        source: 'android',
        device: 'mobile',
        shareMethod: 'facebook',
      }),
    ).toBe(
      'https://abc.ngrok-free.app/@Creator?source=android&device=mobile&share_method=facebook',
    )
  })

  it('appends tracking onto existing urls', () => {
    expect(
      appendShareTracking('https://abc.ngrok-free.app/@u', {
        device: 'mobile',
        shareMethod: 'messenger',
      }),
    ).toBe(
      'https://abc.ngrok-free.app/@u?source=web&device=mobile&share_method=messenger',
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
