/** Shared Studio agreement settings (localStorage). */

export const STUDIO_SETTINGS_DEFAULTS = {
  musicCopyrightCheck: true,
  contentCheckLite: true,
  allowVideoInsights: true,
  includeCommentsForInsights: true,
}

export function studioSettingsStorageKey(userId) {
  return `vibely.studio.settings.${userId || 'guest'}`
}

export function loadStudioSettings(userId) {
  try {
    const raw = localStorage.getItem(studioSettingsStorageKey(userId))
    if (!raw) return { ...STUDIO_SETTINGS_DEFAULTS }
    return { ...STUDIO_SETTINGS_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...STUDIO_SETTINGS_DEFAULTS }
  }
}

export function saveStudioSettings(userId, settings) {
  localStorage.setItem(
    studioSettingsStorageKey(userId),
    JSON.stringify({ ...STUDIO_SETTINGS_DEFAULTS, ...settings }),
  )
  try {
    window.dispatchEvent(new CustomEvent('vibely-studio-settings-changed'))
  } catch {
    /* ignore */
  }
}
