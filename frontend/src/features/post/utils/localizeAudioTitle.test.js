import { describe, expect, it } from 'vitest'
import {
  canonicalOriginalSoundTitle,
  isOriginalSoundTitle,
  localizeAudioTitle,
} from '@/features/post/utils/localizeAudioTitle.js'

describe('localizeAudioTitle', () => {
  const t = (key, opts) => {
    if (key === 'upload.originalAudio') return `original sound - ${opts.name}`
    if (key === 'upload.photo.originalSound') return `Original sound - ${opts.name}`
    if (key === 'studio.editPost.originalSound') return `♫ original sound - ${opts.name}`
    return key
  }

  it('detects Vietnamese original-sound titles', () => {
    expect(isOriginalSoundTitle('âm thanh gốc - Trần Kiên Cường')).toBe(true)
    expect(isOriginalSoundTitle('Original sound - Alice')).toBe(true)
    expect(isOriginalSoundTitle('My cool remix')).toBe(false)
  })

  it('relocalizes stored Vietnamese titles', () => {
    expect(
      localizeAudioTitle('âm thanh gốc - Trần Kiên Cường', t, {
        name: 'Fallback',
        key: 'upload.photo.originalSound',
      }),
    ).toBe('Original sound - Trần Kiên Cường')
  })

  it('keeps custom sound titles', () => {
    expect(
      localizeAudioTitle('Lo-fi beats', t, {
        name: 'Alice',
        key: 'upload.photo.originalSound',
      }),
    ).toBe('Lo-fi beats')
  })

  it('builds canonical English titles for storage', () => {
    expect(canonicalOriginalSoundTitle('Alice')).toBe('original sound - Alice')
  })
})
