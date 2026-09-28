import { LIVE_LIMITS, LIVE_SELECTABLE_CATEGORIES } from '@/features/live/constants/liveConstants.js'

/**
 * Returns a map of field -> i18n key (with params) for invalid fields; empty when valid.
 * @returns {Record<string, { key: string, params?: Record<string, unknown> }>}
 */
export function validateCreateLive({ title, description, categoryId, coverFile }) {
  const errors = {}
  const trimmedTitle = String(title ?? '').trim()

  if (!trimmedTitle) {
    errors.title = { key: 'livePage.create.errors.titleRequired' }
  } else if (trimmedTitle.length > LIVE_LIMITS.TITLE_MAX) {
    errors.title = { key: 'livePage.create.errors.titleTooLong', params: { max: LIVE_LIMITS.TITLE_MAX } }
  }

  if (String(description ?? '').length > LIVE_LIMITS.DESCRIPTION_MAX) {
    errors.description = {
      key: 'livePage.create.errors.descriptionTooLong',
      params: { max: LIVE_LIMITS.DESCRIPTION_MAX },
    }
  }

  if (!LIVE_SELECTABLE_CATEGORIES.some((category) => category.id === categoryId)) {
    errors.categoryId = { key: 'livePage.create.errors.categoryRequired' }
  }

  const coverError = validateLiveCover(coverFile)
  if (coverError) errors.coverFile = coverError

  return errors
}

export function validateLiveCover(file) {
  if (!file) return null
  if (!LIVE_LIMITS.COVER_ACCEPTED_TYPES.includes(file.type)) {
    return { key: 'livePage.create.errors.coverType' }
  }
  if (file.size > LIVE_LIMITS.COVER_MAX_BYTES) {
    return {
      key: 'livePage.create.errors.coverTooLarge',
      params: { max: Math.round(LIVE_LIMITS.COVER_MAX_BYTES / (1024 * 1024)) },
    }
  }
  return null
}
