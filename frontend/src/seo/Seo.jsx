import React from 'react'
import { Helmet } from 'react-helmet-async'
import {
  absoluteUrl,
  canonicalUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
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
      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:secure_url" content={resolvedImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />

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
