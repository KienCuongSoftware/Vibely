import {
  LIVE_CATEGORIES,
  LIVE_DISCOVERY_SECTIONS,
  LIVE_FEED_FILTER,
} from '@/features/live/constants/liveConstants.js'

/**
 * Discovery tabs that currently have at least one broadcasting LIVE.
 * Group tabs (gaming, lifestyle) count their sub-categories too.
 * @param {import('../api/liveContracts.js').LiveSummary[]} lives
 */
export function availableLiveCategories(lives) {
  if (!lives?.length) return []
  const present = new Set(lives.map((live) => live.categoryId))
  return LIVE_CATEGORIES.filter(({ id }) => {
    if (id === LIVE_FEED_FILTER.RECOMMENDED) return true
    if (id === LIVE_FEED_FILTER.FOLLOWING) return lives.some((live) => live.host?.followedByViewer)
    const group = LIVE_DISCOVERY_SECTIONS.find((section) => section.seeAllCategory === id)
    return (group?.categoryIds ?? [id]).some((categoryId) => present.has(categoryId))
  })
}
