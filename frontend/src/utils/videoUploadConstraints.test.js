import { describe, expect, it } from 'vitest'
import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_UPLOAD_BYTES,
  resolveUploadContentType,
  validateVideoFileBasics,
  validateVideoMetadata,
} from './videoUploadConstraints.js'

describe('videoUploadConstraints', () => {
  it('rejects oversized files', () => {
    const file = new File([new Uint8Array(8)], 'big.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: MAX_VIDEO_UPLOAD_BYTES + 1 })
    expect(validateVideoFileBasics(file)).toMatch(/30 GB/)
  })

  it('rejects unsupported formats', () => {
    const file = new File([new Uint8Array(8)], 'clip.avi', { type: 'video/x-msvideo' })
    expect(validateVideoFileBasics(file)).toMatch(/Định dạng/)
  })

  it('accepts mp4 under the size cap', () => {
    const file = new File([new Uint8Array(8)], 'ok.mp4', { type: 'video/mp4' })
    expect(validateVideoFileBasics(file)).toBeNull()
  })

  it('rejects duration over 60 minutes', () => {
    expect(validateVideoMetadata({ duration: MAX_VIDEO_DURATION_SECONDS + 0.1 })).toMatch(/60 phút/)
  })

  it('accepts duration at exactly 60 minutes', () => {
    expect(validateVideoMetadata({ duration: MAX_VIDEO_DURATION_SECONDS })).toBeNull()
  })

  it('maps m4v to video/mp4 content type', () => {
    const file = new File([new Uint8Array(4)], 'a.m4v', { type: 'video/x-m4v' })
    expect(resolveUploadContentType(file)).toBe('video/mp4')
  })
})
