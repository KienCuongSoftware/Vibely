import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  IoBookmark,
  IoBookmarkOutline,
  IoClose,
  IoMusicalNotesOutline,
  IoPause,
  IoPlay,
  IoSearchOutline,
} from 'react-icons/io5'
import { postApi } from '@/features/post/api/postApi.js'
import {
  filterSounds,
  formatSoundDuration,
  getFavoriteSounds,
  getRecentSounds,
  isFavoriteSound,
  pushRecentSound,
  toggleFavoriteSound,
} from '@/features/upload/utils/soundLibraryStore.js'

const TABS = ['recommended', 'favorites', 'recent']

function SoundRow({
  item,
  playing,
  progressPct,
  onPreview,
  onSeek,
  onUse,
  onToggleFavorite,
  favorite,
}) {
  const { t } = useTranslation()
  const title = item.audioTitle?.trim() || t('upload.photo.soundPicker.untitled')
  const meta = [
    formatSoundDuration(item.durationSeconds),
    item.authorDisplayName,
  ].filter(Boolean).join(' · ')

  return (
    <div
      className={`group/sound flex items-center gap-3 border-b border-[#f1f1f2] py-3 last:border-b-0 ${
        playing ? 'bg-[#fafafa]' : ''
      }`}
    >
      <button
        type="button"
        className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md bg-[#f1f1f2]"
        onClick={() => onPreview(item)}
        aria-label={t('upload.photo.soundPicker.preview')}
      >
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#8a8b91]">
            <IoMusicalNotesOutline className="text-xl" aria-hidden />
          </span>
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity ${
            playing
              ? 'opacity-100'
              : 'opacity-0 group-hover/sound:opacity-100'
          }`}
          aria-hidden
        >
          {playing ? (
            <IoPause className="text-2xl" />
          ) : (
            <IoPlay className="translate-x-px text-2xl" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="w-full cursor-pointer text-left"
          onClick={() => onPreview(item)}
        >
          <p className="truncate text-sm font-semibold text-[#161823]">{title}</p>
          <p className="mt-0.5 truncate text-xs text-[#8a8b91]">{meta}</p>
        </button>
        {playing ? (
          <div
            className="group/progress mt-2 h-3 cursor-pointer"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label={t('upload.photo.soundPicker.preview')}
            onClick={(e) => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              if (rect.width <= 0) return
              const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
              onSeek?.(pct)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
              e.preventDefault()
              const delta = e.key === 'ArrowLeft' ? -0.05 : 0.05
              onSeek?.(Math.min(1, Math.max(0, progressPct / 100 + delta)))
            }}
          >
            <div className="relative top-1 h-[3px] rounded-full bg-[#e3e3e4] transition-[height] group-hover/progress:h-[5px]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#161823]"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-black/10 opacity-0 transition-opacity group-hover/progress:opacity-100"
                style={{ left: `${Math.min(100, Math.max(0, progressPct))}%` }}
                aria-hidden
              />
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`shrink-0 cursor-pointer rounded-full p-1.5 text-[#161823] transition-opacity hover:bg-[#f1f1f2] ${
          favorite || playing
            ? 'opacity-100'
            : 'opacity-0 group-hover/sound:opacity-100 focus-visible:opacity-100'
        }`}
        onClick={() => onToggleFavorite(item)}
        aria-label={
          favorite
            ? t('upload.photo.soundPicker.unfavorite')
            : t('upload.photo.soundPicker.favorite')
        }
      >
        {favorite ? (
          <IoBookmark className="text-xl text-[#161823]" aria-hidden />
        ) : (
          <IoBookmarkOutline className="text-xl" aria-hidden />
        )}
      </button>

      <button
        type="button"
        className="shrink-0 cursor-pointer rounded-md bg-[#fe2c55] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#e62a4d]"
        onClick={() => onUse(item)}
      >
        {t('upload.photo.soundPicker.use')}
      </button>
    </div>
  )
}

export function SoundPickerModal({ open, onClose, onSelect }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('recommended')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playingUrl, setPlayingUrl] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [favoriteRevision, setFavoriteRevision] = useState(0)
  const audioRef = useRef(null)
  const debounceRef = useRef(null)

  const stopPreview = useCallback(() => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setPlayingUrl('')
    setProgressPct(0)
  }, [])

  useEffect(() => {
    if (!open) {
      stopPreview()
      setQuery('')
      setTab('recommended')
      setError('')
    }
  }, [open, stopPreview])

  useEffect(() => () => stopPreview(), [stopPreview])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined
    const onTimeUpdate = () => {
      if (!el.duration || !Number.isFinite(el.duration) || el.duration <= 0) {
        setProgressPct(0)
        return
      }
      setProgressPct((el.currentTime / el.duration) * 100)
    }
    el.addEventListener('timeupdate', onTimeUpdate)
    return () => el.removeEventListener('timeupdate', onTimeUpdate)
  }, [open])

  const loadRecommended = useCallback(async (search) => {
    setLoading(true)
    setError('')
    try {
      const res = await postApi.browseSounds(search, { page: 0, size: 30 })
      setItems(Array.isArray(res?.items) ? res.items : [])
    } catch (err) {
      setItems([])
      setError(err?.message || t('upload.photo.soundPicker.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!open) return
    if (tab === 'recommended') {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void loadRecommended(query.trim())
      }, 280)
      return () => clearTimeout(debounceRef.current)
    }
    if (tab === 'favorites') {
      setItems(filterSounds(getFavoriteSounds(), query))
      setLoading(false)
      setError('')
      return undefined
    }
    setItems(filterSounds(getRecentSounds(), query))
    setLoading(false)
    setError('')
    return undefined
  }, [open, tab, query, loadRecommended, favoriteRevision])

  const handlePreview = (item) => {
    if (!item?.audioUrl) return
    if (playingUrl === item.audioUrl) {
      stopPreview()
      return
    }
    stopPreview()
    const el = audioRef.current
    if (!el) return
    el.src = item.audioUrl
    el.play()
      .then(() => {
        setPlayingUrl(item.audioUrl)
        setProgressPct(0)
      })
      .catch(() => {
        setPlayingUrl('')
        setProgressPct(0)
      })
  }

  const handleSeek = (ratio) => {
    const el = audioRef.current
    if (!el?.duration || !Number.isFinite(el.duration) || el.duration <= 0) return
    el.currentTime = el.duration * ratio
    setProgressPct(ratio * 100)
  }

  const handleUse = (item) => {
    pushRecentSound(item)
    stopPreview()
    onSelect?.(item)
    onClose?.()
  }

  const handleToggleFavorite = (item) => {
    toggleFavoriteSound(item)
    setFavoriteRevision((v) => v + 1)
  }

  if (!open) return null

  const list = tab === 'recommended' ? items : filterSounds(items, query)

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 py-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="flex max-h-[min(720px,90vh)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sound-picker-title"
      >
        <div className="flex items-center justify-between border-b border-[#f1f1f2] px-5 py-4">
          <h2 id="sound-picker-title" className="text-lg font-bold text-[#161823]">
            {t('upload.photo.soundPicker.title')}
          </h2>
          <button
            type="button"
            className="cursor-pointer rounded-full p-1.5 text-[#161823] hover:bg-[#f1f1f2]"
            onClick={() => {
              stopPreview()
              onClose?.()
            }}
            aria-label={t('common.close')}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <IoSearchOutline
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8b91]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('upload.photo.soundPicker.search')}
              className="w-full rounded-lg bg-[#f1f1f2] py-2.5 pr-3 pl-9 text-sm text-[#161823] outline-none placeholder:text-[#8a8b91]"
            />
          </div>
          <div className="mt-4 flex gap-6 border-b border-[#f1f1f2]">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                className={`cursor-pointer pb-2.5 text-sm font-semibold ${
                  tab === id
                    ? 'border-b-2 border-[#161823] text-[#161823]'
                    : 'text-[#8a8b91] hover:text-[#161823]'
                }`}
                onClick={() => setTab(id)}
              >
                {t(`upload.photo.soundPicker.tabs.${id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-[#8a8b91]">
              {t('upload.photo.soundPicker.loading')}
            </p>
          ) : null}
          {!loading && error ? (
            <p className="py-10 text-center text-sm text-[#fe2c55]">{error}</p>
          ) : null}
          {!loading && !error && list.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#8a8b91]">
              {t(`upload.photo.soundPicker.empty.${tab}`)}
            </p>
          ) : null}
          {!loading && !error
            ? list.map((item) => (
                <SoundRow
                  key={item.audioUrl}
                  item={item}
                  playing={playingUrl === item.audioUrl}
                  progressPct={playingUrl === item.audioUrl ? progressPct : 0}
                  favorite={isFavoriteSound(item.audioUrl)}
                  onPreview={handlePreview}
                  onSeek={handleSeek}
                  onUse={handleUse}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))
            : null}
        </div>
      </div>
      <audio ref={audioRef} className="hidden" onEnded={stopPreview} />
    </div>,
    document.body,
  )
}
