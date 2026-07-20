import React from 'react'
import { Helmet } from 'react-helmet-async'
import {
  absoluteUrl,
  canonicalUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_TITLE,
  SITE_NAME,
  truncateText,
} from './seoConfig.js'
import { organizationJsonLd, websiteJsonLd } from './jsonLd.js'

export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  jsonLd = [],
}) {
  const resolvedTitle = truncateText(title, 70) || DEFAULT_TITLE
  const resolvedDescription = truncateText(description, 180) || DEFAULT_DESCRIPTION
  const resolvedCanonical = canonicalUrl(canonical)
  const resolvedImage = absoluteUrl(image || DEFAULT_OG_IMAGE)
  const jsonLdItems = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd].filter(Boolean)

  return (
    <Helmet>
      <html lang="vi" />
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="keywords" content={keywords || DEFAULT_KEYWORDS} />
      <link rel="canonical" href={resolvedCanonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="vi_VN" />
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
