import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchHistory } from './useSearchHistory'
import {
  buildHashtagHref,
  buildProfileHref,
  buildSearchResultsHref,
  buildVideoHref,
  normalizeSearchQuery,
} from '../components/search/searchUtils'

/**
 * Điều hướng từ gợi ý tìm kiếm (modal, watch dropdown, v.v.).
 */
export function useSearchNavigation({ token, onBeforeNavigate } = {}) {
  const navigate = useNavigate()
  const { record: recordHistory } = useSearchHistory({
    token,
    enabled: false,
  })

  const navigateTo = useCallback(
    async (rawQuery, to) => {
      const normalized = normalizeSearchQuery(rawQuery)
      if (normalized && token) {
        await recordHistory(normalized)
      }
      onBeforeNavigate?.()
      navigate(to)
    },
    [navigate, onBeforeNavigate, recordHistory, token],
  )

  const goToSearchResults = useCallback(
    async (rawQuery) => {
      const normalized = normalizeSearchQuery(rawQuery)
      if (!normalized) return
      if (token) {
        await recordHistory(normalized)
      }
      onBeforeNavigate?.()
      navigate(buildSearchResultsHref(normalized))
    },
    [navigate, onBeforeNavigate, recordHistory, token],
  )

  const activateNavItem = useCallback(
    (item, { fallbackQuery = '' } = {}) => {
      if (!item) return
      if (item.type === 'history') {
        return { action: 'fill', query: item.payload?.query ?? '' }
      }
      if (item.type === 'search') {
        void goToSearchResults(item.payload?.query ?? fallbackQuery)
        return { action: 'done' }
      }
      if (item.type === 'trending') {
        void goToSearchResults(item.payload?.keyword ?? '')
        return { action: 'done' }
      }
      if (item.type === 'user') {
        void navigateTo(item.payload?.username, buildProfileHref(item.payload?.username))
        return { action: 'done' }
      }
      if (item.type === 'hashtag') {
        void navigateTo(item.payload?.tag, buildHashtagHref(item.payload?.tag))
        return { action: 'done' }
      }
      if (item.type === 'video') {
        const label =
          item.payload?.description ||
          item.payload?.title ||
          fallbackQuery
        void navigateTo(label, buildVideoHref(item.payload?.publicId))
        return { action: 'done' }
      }
      return null
    },
    [goToSearchResults, navigateTo],
  )

  return { goToSearchResults, activateNavItem, navigateTo }
}
