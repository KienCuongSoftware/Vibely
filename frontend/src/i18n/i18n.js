import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LOCALE_KEY = 'vibely:locale'

const eagerModules = import.meta.glob(['./en.json', './vi.json'], { eager: true })
const lazyModules = import.meta.glob('./*.json')

const bundleOf = (modules) => Object.fromEntries(
  Object.entries(modules).map(([path, module]) => {
    const code = path.match(/\/([^/]+)\.json$/)?.[1]
    return [code, { translation: module.default }]
  }).filter(([code]) => Boolean(code)),
)

const resources = bundleOf(eagerModules)
const localeLoads = new Map()

/** Loads a locale that is not English or Vietnamese. Those two ship with the app. */
export function ensureLocale(code) {
  if (!code || resources[code] || i18n.hasResourceBundle(code, 'translation')) return Promise.resolve()
  const loader = lazyModules[`./${code}.json`]
  if (!loader) return Promise.resolve()
  if (!localeLoads.has(code)) {
    localeLoads.set(code, loader().then((module) => {
      i18n.addResourceBundle(code, 'translation', module.default, true, true)
    }))
  }
  return localeLoads.get(code)
}

export function getSavedLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) || 'en'
  } catch {
    return 'en'
  }
}

export function saveLocale(lang) {
  try {
    localStorage.setItem(LOCALE_KEY, lang)
  } catch {
    // ignore
  }
}

const savedLocale = getSavedLocale()
const initialLocale = resources[savedLocale] ? savedLocale : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en',
  supportedLngs: Object.keys(lazyModules).map((path) => path.match(/\/([^/]+)\.json$/)?.[1]).filter(Boolean),
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (code) => {
  void ensureLocale(code)
})

if (savedLocale !== initialLocale) {
  void ensureLocale(savedLocale).then(() => i18n.changeLanguage(savedLocale))
}

export default i18n
