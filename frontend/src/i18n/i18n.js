import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LOCALE_KEY = 'vibely:locale'

const localeModules = import.meta.glob('./*.json', { eager: true })

const resources = Object.fromEntries(
  Object.entries(localeModules).map(([path, module]) => {
    const code = path.match(/\/([^/]+)\.json$/)?.[1]
    return [code, { translation: module.default }]
  }).filter(([code]) => Boolean(code)),
)

export function getSavedLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) || 'vi'
  } catch {
    return 'vi'
  }
}

export function saveLocale(lang) {
  try {
    localStorage.setItem(LOCALE_KEY, lang)
  } catch {
    // ignore
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLocale(),
  fallbackLng: 'en',
  supportedLngs: Object.keys(resources),
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
