import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n/i18n.js'
import { buildActivityActionText } from '@/features/notification/utils/activityUtils.js'

describe('buildActivityActionText', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  it('aggregates video like copy for multiple actors', () => {
    expect(
      buildActivityActionText({ type: 'video_like', actorCount: 1 }),
    ).toBe('đã thích video của bạn')
    expect(
      buildActivityActionText({ type: 'video_like', actorCount: 2 }),
    ).toBe('và 1 người khác đã thích video của bạn')
    expect(
      buildActivityActionText({ type: 'video_like', actorCount: 91 }),
    ).toBe('và 90 người khác đã thích video của bạn')
  })

  it('aggregates comment reply and comment like copy', () => {
    expect(
      buildActivityActionText({ type: 'comment_reply', actorCount: 3 }),
    ).toBe('và 2 người khác đã trả lời bình luận của bạn')
    expect(
      buildActivityActionText({ type: 'comment_like', actorCount: 4 }),
    ).toBe('và 3 người khác đã thích bình luận của bạn')
  })

  it('aggregates mention and follow copy', () => {
    expect(
      buildActivityActionText({ type: 'mention', actorCount: 1 }),
    ).toBe('đã nhắc đến bạn trong bình luận')
    expect(
      buildActivityActionText({ type: 'mention', actorCount: 3 }),
    ).toBe('và 2 người khác đã nhắc đến bạn trong bình luận')
    expect(
      buildActivityActionText({ type: 'follow', actorCount: 5 }),
    ).toBe('và 4 người khác đã bắt đầu follow bạn')
  })

  it('uses English copy when locale is en', async () => {
    await i18n.changeLanguage('en')
    expect(
      buildActivityActionText({ type: 'follow', actorCount: 1 }),
    ).toBe('started following you')
  })
})
