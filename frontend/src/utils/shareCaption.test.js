import { describe, expect, it } from 'vitest'
import { isJunkCaption, pickShareCaption } from './shareCaption.js'

describe('shareCaption', () => {
  it('treats snaptik filenames as junk', () => {
    expect(isJunkCaption('snaptik.vn_7650223146485927189')).toBe(true)
  })

  it('prefers description when title is upload filename', () => {
    const caption = pickShareCaption({
      title: 'snaptik.vn_7650223146485927189',
      description: 'Nước Mắt Anh Rơi Không Ngừng #nhacremix',
    })
    expect(caption).toContain('Nước Mắt Anh Rơi')
    expect(caption).not.toContain('snaptik')
  })
})
