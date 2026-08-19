import { useTranslation } from 'react-i18next'
import { saveLocale } from './i18n.js'

export const SUPPORTED_LANGUAGES = [
  { code: 'af', label: 'Afrikaans', nativeLabel: 'Afrikaans' },
  { code: 'az', label: 'Azerbaijani', nativeLabel: 'Azərbayacan' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'jv', label: 'Javanese', nativeLabel: 'Basa Jawa' },
  { code: 'ca', label: 'Catalan', nativeLabel: 'Català' },
  { code: 'ceb', label: 'Cebuano', nativeLabel: 'Cebuano' },
  { code: 'cs', label: 'Czech', nativeLabel: 'Čeština' },
  { code: 'da', label: 'Danish', nativeLabel: 'Dansk' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'et', label: 'Estonian', nativeLabel: 'Eesti' },
  { code: 'en-GB', label: 'English (UK)', nativeLabel: 'English (UK)' },
  { code: 'vi', label: 'Tiếng Việt', nativeLabel: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeLabel: 'English (US)' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'es-419', label: 'Spanish (Latin America)', nativeLabel: 'Español (Latinoamérica)' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'fr-CA', label: 'French (Canada)', nativeLabel: 'Français (Canada)' },
  { code: 'ga', label: 'Irish', nativeLabel: 'Gaeilge' },
  { code: 'hr', label: 'Croatian', nativeLabel: 'Hrvatski' },
  { code: 'is', label: 'Icelandic', nativeLabel: 'Íslenska' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili' },
  { code: 'lv', label: 'Latvian', nativeLabel: 'Latviešu' },
  { code: 'lt', label: 'Lithuanian', nativeLabel: 'Lietuvių' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'nb', label: 'Norwegian Bokmål', nativeLabel: 'norsk (bokmål)' },
  { code: 'uz', label: 'Uzbek', nativeLabel: 'O‘zbek' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Português (Brasil)' },
  { code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
  { code: 'sq', label: 'Albanian', nativeLabel: 'Shqip' },
  { code: 'sk', label: 'Slovak', nativeLabel: 'Slovenčina' },
  { code: 'sl', label: 'Slovenian', nativeLabel: 'Slovenščina' },
  { code: 'fi', label: 'Finnish', nativeLabel: 'Suomi' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά' },
  { code: 'bg', label: 'Bulgarian', nativeLabel: 'Български' },
  { code: 'kk', label: 'Kazakh', nativeLabel: 'Қазақша' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'th', label: 'Thai', nativeLabel: 'ภาษาไทย' },
  { code: 'my', label: 'Burmese', nativeLabel: 'မြန်မာ' },
  { code: 'km', label: 'Khmer', nativeLabel: 'ខ្មែរ' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)', nativeLabel: '中文 (繁體)' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)', nativeLabel: '中文 (简体)' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
]

export function useLocale() {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const normalizedLocale = String(locale || 'vi').toLowerCase()
  const languages = [...SUPPORTED_LANGUAGES]
    .sort((a, b) => a.nativeLabel.localeCompare(b.nativeLabel, 'en', { sensitivity: 'base' }))
    .sort((a, b) => {
      const aCode = a.code.toLowerCase()
      const bCode = b.code.toLowerCase()
      const aSelected = normalizedLocale === aCode || normalizedLocale.startsWith(`${aCode}-`)
      const bSelected = normalizedLocale === bCode || normalizedLocale.startsWith(`${bCode}-`)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })

  const changeLanguage = (lang) => {
    saveLocale(lang)
    i18n.changeLanguage(lang)
  }

  return {
    locale,
    changeLanguage,
    languages,
  }
}
