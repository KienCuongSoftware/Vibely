import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'

const MIN_CONFIDENCE = 0.7
const MAX_SUGGESTIONS = 8

function slugToHashtag(slug) {
  const s = String(slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .replace(/-/g, '')
  return s ? `#${s}` : ''
}

function descriptionHasHashtag(description, hashtag) {
  const needle = String(hashtag ?? '').toLowerCase()
  if (!needle) return false
  const tokens = String(description ?? '').toLowerCase().match(/#[a-z0-9_]+/g) ?? []
  return tokens.includes(needle)
}

/**
 * Phase 5 — click-to-append CU semantic tag hashtags into description.
 * Does not auto-insert; creator must click a suggestion.
 */
export function CuHashtagSuggestions({ publicId, token, description, onAppend }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicId || !token) {
      setTags([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    apiClient
      .getVideoSemanticTags(publicId, token)
      .then((rows) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setTags(
          list
            .filter((t) => Number(t?.confidence ?? 0) >= MIN_CONFIDENCE && t?.slug)
            .slice(0, MAX_SUGGESTIONS),
        )
      })
      .catch(() => {
        if (!cancelled) setTags([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicId, token])

  const suggestions = useMemo(() => {
    return tags
      .map((t) => {
        const hashtag = slugToHashtag(t.slug)
        return hashtag
          ? { slug: t.slug, name: t.name, hashtag, confidence: t.confidence }
          : null
      })
      .filter(Boolean)
      .filter((s) => !descriptionHasHashtag(description, s.hashtag))
  }, [tags, description])

  const handleClick = useCallback(
    (hashtag) => {
      if (typeof onAppend !== 'function') return
      onAppend(hashtag)
    },
    [onAppend],
  )

  if (!publicId || (!loading && suggestions.length === 0 && tags.length === 0)) {
    return null
  }

  if (!loading && suggestions.length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-zinc-500">
        Gợi ý hashtag từ phân tích nội dung
        {loading ? '…' : ''}
      </p>
      {suggestions.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.slug}
              type="button"
              className="cursor-pointer rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[12px] font-medium text-zinc-200 transition hover:border-[#fe2c55]/50 hover:text-white"
              title={s.name ? `${s.name} (${Math.round(Number(s.confidence) * 100)}%)` : s.hashtag}
              onClick={() => handleClick(s.hashtag)}
            >
              {s.hashtag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
