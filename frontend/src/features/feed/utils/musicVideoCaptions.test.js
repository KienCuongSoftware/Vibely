import { describe, expect, it } from 'vitest'
import { isMusicVideoForCaptions } from '@/features/feed/utils/musicVideoCaptions.js'

describe('isMusicVideoForCaptions', () => {
  it('detects music hashtags', () => {
    expect(
      isMusicVideoForCaptions({
        title: 'Trót yêu nhau',
        description: '#nhachaymoingay #lofi #lyrics',
        audioTitle: 'original sound - Demo',
      }),
    ).toBe(true)
  })

  it('keeps normal clips eligible for captions', () => {
    expect(
      isMusicVideoForCaptions({
        title: 'Vlog',
        description: '#fyp #funny',
        audioTitle: 'original sound - Demo',
      }),
    ).toBe(false)
  })
})
