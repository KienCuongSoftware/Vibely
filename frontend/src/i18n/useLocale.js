import { useTranslation } from 'react-i18next'
import { saveLocale } from './i18n.js'

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', nativeLabel: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
]

export function useLocale() {
  const { i18n } = useTranslation()

  const changeLanguage = (lang) => {
    saveLocale(lang)
    i18n.changeLanguage(lang)
  }

  return {
    locale: i18n.language,
    changeLanguage,
    languages: SUPPORTED_LANGUAGES,
  }
}
