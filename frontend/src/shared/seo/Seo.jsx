import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import {
  absoluteUrl,
  canonicalUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_TITLE,
  SITE_NAME,
  truncateText,
} from '@/shared/seo/seoConfig.js'
import { organizationJsonLd, websiteJsonLd } from '@/shared/seo/jsonLd.js'

const OG_LOCALE_BY_LANG = {
  vi: 'vi_VN',
  en: 'en_US',
  'en-GB': 'en_GB',
  ja: 'ja_JP',
  ko: 'ko_KR',
  'zh-Hans': 'zh_CN',
  'zh-Hant': 'zh_TW',
  fr: 'fr_FR',
  'fr-CA': 'fr_CA',
  de: 'de_DE',
  es: 'es_ES',
  'es-419': 'es_419',
  th: 'th_TH',
  id: 'id_ID',
  ru: 'ru_RU',
  ar: 'ar_AR',
  pt: 'pt_PT',
  'pt-BR': 'pt_BR',
}

function resolveHtmlLang(language) {
  const raw = String(language || 'en').trim()
  if (!raw) return 'en'
  return raw.split('-')[0] || 'en'
}

function resolveOgLocale(language) {
  const raw = String(language || 'en').trim()
  if (OG_LOCALE_BY_LANG[raw]) return OG_LOCALE_BY_LANG[raw]
  const base = resolveHtmlLang(raw)
  return OG_LOCALE_BY_LANG[base] || 'en_US'
}

export function Seo({
  title,
  description,
  keywords,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  jsonLd = [],
}) {
  const { t, i18n } = useTranslation()
  const defaultDescription = t('seo.defaultDescription')
  const defaultKeywords = t('seo.defaultKeywords')
  const resolvedTitle = truncateText(title || DEFAULT_TITLE, 70) || DEFAULT_TITLE
  const resolvedDescription =
    truncateText(description || defaultDescription, 180) || defaultDescription
  const resolvedCanonical = canonicalUrl(canonical)
  const resolvedImage = absoluteUrl(image || DEFAULT_OG_IMAGE)
  const jsonLdItems = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd].filter(Boolean)
  const htmlLang = resolveHtmlLang(i18n.language)
  const ogLocale = resolveOgLocale(i18n.language)

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <link rel="canonical" href={resolvedCanonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:secure_url" content={resolvedImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={String(DEFAULT_OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(DEFAULT_OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={DEFAULT_OG_IMAGE_ALT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:image:alt" content={DEFAULT_OG_IMAGE_ALT} />

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  )
}

export function DefaultSeo() {
  return (
    <Seo
      jsonLd={[
        organizationJsonLd(),
        websiteJsonLd(),
      ]}
    />
  )
}
