import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './vi.json'
import en from './en.json'

const LOCALE_KEY = 'vibely:locale'

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
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: getSavedLocale(),
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
