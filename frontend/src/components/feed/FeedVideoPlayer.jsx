import React, { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { FEED_CONFIG } from '../../feed/feedConfig.js'
import { isHlsPlaybackUrl } from '../../feed/feedPlayback.js'
import {
  applyStreamQuality,
  getAvailableQualitiesFromLevels,
  getAvailableQualitiesFromMasterPlaylist,
  getAvailableQualitiesFromSourceHeight,
} from '../../feed/hlsQualityUtils.js'
import { detectLetterboxedLandscapeLayout } from './feedLetterboxLayout'

function buildHlsInstance({ prefetch = false } = {}) {
  return new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    /** Chỉ prefetch fragment khi slide đang phát — tránh ăn băng thông CDN. */
    startFragPrefetch: !prefetch,
    capLevelToPlayerSize: true,
    maxBufferLength: prefetch ? 6 : 24,
    maxMaxBufferLength: prefetch ? 10 : 48,
    backBufferLength: prefetch ? 0 : 20,
    maxBufferSize: prefetch ? 8 * 1000 * 1000 : 35 * 1000 * 1000,
  })
}

function isHlsUrl(url) {
  return isHlsPlaybackUrl(url)
}

/** Autoplay: thử có tiếng trước; trình duyệt chặn thì mute rồi play lại. */
async function playWithAutoplayPolicy(videoEl, wantsSound) {
  if (!videoEl) return
  if (wantsSound) {
    videoEl.muted = false
    try {
      await videoEl.play()
      return
    } catch {
      videoEl.muted = true
      try {
        await videoEl.play()
      } catch {
        /* autoplay policy */
      }
    }
  } else {
    videoEl.muted = true
    try {
      await videoEl.play()
    } catch {
      /* autoplay policy */
    }
  }
}

/**
 * HTML5 video for the feed. When {@code loadMedia} is false, no {@code src} is set (memory release).
 * HLS (.m3u8) dùng hls.js khi trình duyệt hỗ trợ; {@code streamQuality} điều khiển rendition (ABR khi auto).
 */
export const FeedVideoPlayer = React.memo(React.forwardRef(function FeedVideoPlayer(
  {
    videoUrl,
    poster,
    muted = true,
    loop = true,
    loadMedia,
    isActive,
    userPaused = false,
    visibilityRatio = 0,
    playsInline = true,
    className = '',
    onClick,
    feedVideoId,
    onPlaybackTick,
    onPlaybackEnded,
    streamQuality = 'auto',
    sourceHeightPx,
    /** Gọi khi manifest HLS đã parse — danh sách mode khả dụng từ rendition. */
    onHlsQualitiesAvailable,
    /** Phóng nhẹ video ngang khi đang dùng object-cover (overflow ẩn) */
    landscapeBoost = false,
    /** Video ngang: hiển thị đủ khung (letterbox) thay vì cắt mép (cover) */
    containLandscape = false,
    /** Luôn object-contain — toàn bộ video nằm trong khung (mobile feed). */
    fitContain = false,
    /** Gọi khi biết layout intrinsic: (wide, videoId). videoId để parent lọc callback cũ. */
    onIntrinsicLandscape,
  },
  forwardedRef,
) {
  const innerRef = useRef(null)
  const hlsRef = useRef(null)
  const streamQualityRef = useRef(streamQuality)
  streamQualityRef.current = streamQuality
  const onIntrinsicLandscapeRef = useRef(onIntrinsicLandscape)
  onIntrinsicLandscapeRef.current = onIntrinsicLandscape
  const onHlsQualitiesAvailableRef = useRef(onHlsQualitiesAvailable)
  onHlsQualitiesAvailableRef.current = onHlsQualitiesAvailable
  const feedVideoIdRef = useRef(feedVideoId)
  feedVideoIdRef.current = feedVideoId
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive
  const userPausedRef = useRef(userPaused)
  userPausedRef.current = userPaused
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const [isWideAspect, setIsWideAspect] = useState(false)

  useEffect(() => {
    const el = innerRef.current
    if (el && el.tagName === 'VIDEO') {
      el.muted = muted
    }
  }, [muted])

  const tryPlayActive = useCallback(() => {
    const el = innerRef.current
    if (!el || el.tagName !== 'VIDEO' || !loadMedia || !videoUrl || !isActiveRef.current) {
      return
    }
    const visibleEnough =
      visibilityRatio >= FEED_CONFIG.PLAY_VISIBILITY_RATIO ||
      (isActiveRef.current && visibilityRatio === 0)
    const shouldPause =
      visibilityRatio > 0 &&
      visibilityRatio < FEED_CONFIG.PAUSE_VISIBILITY_RATIO
    if (!visibleEnough || shouldPause || userPausedRef.current) return
    void playWithAutoplayPolicy(el, !mutedRef.current)
  }, [loadMedia, videoUrl, visibilityRatio])

  const tryPlayActiveRef = useRef(tryPlayActive)
  tryPlayActiveRef.current = tryPlayActive

  useEffect(() => {
    setIsWideAspect(false)
  }, [videoUrl, loadMedia])

  const setRefs = (node) => {
    innerRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const emitAvailableQualities = useCallback(() => {
    if (!isActiveRef.current) return
    const hls = hlsRef.current
    if (hls?.levels?.length) {
      onHlsQualitiesAvailableRef.current?.(
        getAvailableQualitiesFromLevels(hls.levels),
      )
      return
    }
    const el = innerRef.current
    if (!el || el.tagName !== 'VIDEO' || isHlsUrl(videoUrl)) return
    const fromMeta = el.videoHeight
    const fromApi = Number(sourceHeightPx ?? 0)
    const height =
      Number.isFinite(fromMeta) && fromMeta > 0
        ? fromMeta
        : Number.isFinite(fromApi) && fromApi > 0
          ? fromApi
          : 0
    onHlsQualitiesAvailableRef.current?.(
      getAvailableQualitiesFromSourceHeight(height),
    )
  }, [videoUrl, sourceHeightPx])

  const emitAvailableQualitiesRef = useRef(emitAvailableQualities)
  emitAvailableQualitiesRef.current = emitAvailableQualities

  useEffect(() => {
    if (!isActive || !loadMedia || !videoUrl) return
    emitAvailableQualitiesRef.current()
    const hls = hlsRef.current
    if (hls?.levels?.length) {
      applyStreamQuality(hls, streamQualityRef.current)
    }
  }, [isActive, loadMedia, videoUrl, sourceHeightPx])

  const reportIntrinsicLayout = useCallback((el) => {
    if (!el || el.tagName !== 'VIDEO') return
    const vid = feedVideoIdRef.current
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      const intrinsicWide = el.videoWidth >= el.videoHeight
      const letterboxWide =
        !intrinsicWide && detectLetterboxedLandscapeLayout(el)
      const wideFit = intrinsicWide || letterboxWide
      setIsWideAspect((prev) => (prev === wideFit ? prev : wideFit))
      onIntrinsicLandscapeRef.current?.(wideFit, vid)
    } else {
      setIsWideAspect((prev) => (prev === false ? prev : false))
      onIntrinsicLandscapeRef.current?.(false, vid)
    }
  }, [])

  useEffect(() => {
    const el = innerRef.current
    if (!el || el.tagName !== 'VIDEO') return undefined

    if (!loadMedia || !videoUrl) {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {
          /* noop */
        }
        hlsRef.current = null
      }
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
      } catch {
        /* noop */
      }
      return undefined
    }

    let cancelled = false

    const destroyHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {
          /* noop */
        }
        hlsRef.current = null
      }
    }

    if (!isHlsUrl(videoUrl)) {
      destroyHls()
      el.src = videoUrl
      const reportProgressiveQualities = () => {
        if (cancelled) return
        emitAvailableQualitiesRef.current()
      }
      const onCanPlay = () => {
        if (!cancelled) tryPlayActiveRef.current()
      }
      el.addEventListener('loadedmetadata', reportProgressiveQualities)
      el.addEventListener('canplay', onCanPlay)
      return () => {
        if (cancelled) return
        el.removeEventListener('loadedmetadata', reportProgressiveQualities)
        el.removeEventListener('canplay', onCanPlay)
        try {
          el.pause()
          el.removeAttribute('src')
          el.load()
        } catch {
          /* noop */
        }
      }
    }

    if (Hls.isSupported()) {
      const prefetch = loadMedia && !isActiveRef.current
      const hls = buildHlsInstance({ prefetch })
      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(el)
      const onParsed = () => {
        if (cancelled) return
        if (isActiveRef.current) {
          onHlsQualitiesAvailableRef.current?.(
            getAvailableQualitiesFromLevels(hls.levels),
          )
        }
        applyStreamQuality(hls, streamQualityRef.current)
        if (isActiveRef.current) {
          try {
            hls.startLoad(-1)
          } catch {
            /* noop */
          }
          requestAnimationFrame(() => reportIntrinsicLayout(el))
          tryPlayActiveRef.current()
        } else {
          try {
            hls.stopLoad()
          } catch {
            /* noop */
          }
        }
      }
      const onLevelSwitch = () => {
        if (cancelled || !isActiveRef.current) return
        requestAnimationFrame(() => reportIntrinsicLayout(el))
      }
      const onError = (_event, data) => {
        if (cancelled || !data?.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          try {
            hls.startLoad(-1)
            return
          } catch {
            /* fall through */
          }
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError()
            return
          } catch {
            /* fall through */
          }
        }
        try {
          hls.destroy()
        } catch {
          /* noop */
        }
        if (hlsRef.current === hls) hlsRef.current = null
      }
      hls.on(Hls.Events.MANIFEST_PARSED, onParsed)
      hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitch)
      hls.on(Hls.Events.ERROR, onError)
      return () => {
        cancelled = true
        hls.off(Hls.Events.MANIFEST_PARSED, onParsed)
        hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitch)
        hls.off(Hls.Events.ERROR, onError)
        destroyHls()
        try {
          el.pause()
          el.removeAttribute('src')
          el.load()
        } catch {
          /* noop */
        }
      }
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = videoUrl
      const loadNativeQualities = async () => {
        if (cancelled || !isActiveRef.current) return
        try {
          const res = await fetch(videoUrl)
          const text = await res.text()
          if (cancelled || !isActiveRef.current) return
          onHlsQualitiesAvailableRef.current?.(
            getAvailableQualitiesFromMasterPlaylist(text),
          )
        } catch {
          /* noop */
        }
      }
      void loadNativeQualities()
      return () => {
        cancelled = true
        try {
          el.pause()
          el.removeAttribute('src')
          el.load()
        } catch {
          /* noop */
        }
      }
    }

    destroyHls()
    el.src = videoUrl
    return () => {
      cancelled = true
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
      } catch {
        /* noop */
      }
    }
  }, [loadMedia, videoUrl, isActive])

  useEffect(() => {
    const hls = hlsRef.current
    if (!hls) return
    const applied = applyStreamQuality(hls, streamQuality)
    if (!applied && streamQuality !== 'auto') {
      applyStreamQuality(hls, 'auto')
    }
  }, [streamQuality])

  useEffect(() => {
    const el = innerRef.current
    if (!el || el.tagName !== 'VIDEO' || !loadMedia || !videoUrl) return undefined
    const visibleEnough =
      visibilityRatio >= FEED_CONFIG.PLAY_VISIBILITY_RATIO ||
      (isActive && visibilityRatio === 0)
    const shouldPlay = isActive && visibleEnough
    const shouldPause =
      visibilityRatio > 0 &&
      visibilityRatio < FEED_CONFIG.PAUSE_VISIBILITY_RATIO
    if (userPaused) {
      return undefined
    }
    if (shouldPlay && !shouldPause) {
      void playWithAutoplayPolicy(el, !muted)
      requestAnimationFrame(() => reportIntrinsicLayout(el))
    } else {
      try {
        el.pause()
      } catch {
        /* noop */
      }
    }
    return undefined
  }, [isActive, loadMedia, videoUrl, visibilityRatio, muted, userPaused])

  useEffect(() => {
    if (!loadMedia || !videoUrl || !isActive) return undefined
    onIntrinsicLandscapeRef.current?.(
      isWideAspect,
      feedVideoIdRef.current,
    )
    return undefined
  }, [isWideAspect, loadMedia, videoUrl, isActive, feedVideoId])

  /** Khi vừa scroll tới clip: quét lại sau decode (tránh lệch so với lúc làm hàng xóm). */
  useEffect(() => {
    const el = innerRef.current
    if (!isActive || !loadMedia || !videoUrl || !el || el.tagName !== 'VIDEO')
      return undefined

    const run = () => reportIntrinsicLayout(el)

    run()
    const raf = requestAnimationFrame(run)
    const t1 = window.setTimeout(run, 90)
    const t2 = window.setTimeout(run, 280)
    const onPlaying = () => run()
    el.addEventListener('playing', onPlaying, { once: true })

    let rvfHandle = 0
    if (typeof el.requestVideoFrameCallback === 'function') {
      const onFrame = () => {
        reportIntrinsicLayout(el)
      }
      rvfHandle = el.requestVideoFrameCallback(onFrame)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      el.removeEventListener('playing', onPlaying)
      if (
        rvfHandle &&
        typeof el.cancelVideoFrameCallback === 'function'
      ) {
        try {
          el.cancelVideoFrameCallback(rvfHandle)
        } catch {
          /* noop */
        }
      }
    }
  }, [isActive, loadMedia, videoUrl, reportIntrinsicLayout])

  const handleLoadedMetadata = (e) => {
    const el = e.currentTarget
    reportIntrinsicLayout(el)
    requestAnimationFrame(() => reportIntrinsicLayout(el))
    tryPlayActiveRef.current()
    onPlaybackTick?.(e)
  }

  const handleLoadedData = (e) => {
    reportIntrinsicLayout(e.currentTarget)
  }

  const handlePlaying = (e) => {
    const el = e.currentTarget
    try {
      el.removeAttribute('poster')
    } catch {
      /* noop */
    }
  }

  if (!loadMedia || !videoUrl) {
    return (
      <div
        className={`${className} bg-zinc-950 bg-cover bg-center`}
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
        aria-hidden
      />
    )
  }

  const fitClass =
    fitContain || (containLandscape && isWideAspect)
      ? 'object-contain'
      : 'object-cover'
  const boostClass =
    landscapeBoost && isWideAspect && !containLandscape && !fitContain
      ? ' origin-center scale-[1.08] sm:scale-[1.12] motion-reduce:transform-none'
      : ''

  return (
    <video
      ref={setRefs}
      className={`${className} ${fitClass}${boostClass}`}
      poster={poster || undefined}
      playsInline={playsInline}
      muted={muted}
      loop={loop}
      preload={isActive ? 'auto' : loadMedia ? 'metadata' : 'none'}
      data-feed-video-id={feedVideoId != null ? String(feedVideoId) : undefined}
      onLoadedMetadata={handleLoadedMetadata}
      onLoadedData={handleLoadedData}
      onPlaying={handlePlaying}
      onTimeUpdate={onPlaybackTick}
      onSeeked={onPlaybackTick}
      onEnded={(e) => {
        onPlaybackTick?.(e)
        onPlaybackEnded?.(e)
      }}
      onClick={onClick}
    />
  )
}))
