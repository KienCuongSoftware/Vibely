import React, { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { FEED_CONFIG } from '../../feed/feedConfig.js'
import { isHlsPlaybackUrl } from '../../feed/feedPlayback.js'
import { detectLetterboxedLandscapeLayout } from './feedLetterboxLayout'

function buildHlsInstance({ prefetch = false } = {}) {
  return new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    startFragPrefetch: true,
    /** Buffer nhỏ hơn khi prefetch slide kế — tiết kiệm RAM */
    maxBufferLength: prefetch ? 8 : 12,
    maxMaxBufferLength: prefetch ? 12 : 24,
    backBufferLength: 0,
    maxBufferSize: prefetch ? 12 * 1000 * 1000 : 18 * 1000 * 1000,
  })
}

/**
 * @param {import('hls.js').default} hls
 * @param {'auto' | '540' | '720'} mode
 */
function applyStreamQuality(hls, mode) {
  if (!hls?.levels?.length) return
  if (mode === 'auto') {
    hls.currentLevel = -1
    return
  }
  const cap = mode === '720' ? 720 : 540
  let picked = -1
  let bestH = -1
  for (let i = 0; i < hls.levels.length; i++) {
    const h = hls.levels[i]?.height ?? 0
    if (h > 0 && h <= cap && h > bestH) {
      bestH = h
      picked = i
    }
  }
  if (picked < 0) {
    let minH = Infinity
    for (let i = 0; i < hls.levels.length; i++) {
      const h = hls.levels[i]?.height ?? 99999
      if (h < minH) {
        minH = h
        picked = i
      }
    }
    if (picked < 0) picked = 0
  }
  hls.currentLevel = picked
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
    streamQuality = 'auto',
    /** Phóng nhẹ video ngang khi đang dùng object-cover (overflow ẩn) */
    landscapeBoost = false,
    /** Video ngang: hiển thị đủ khung (letterbox) thay vì cắt mép (cover) */
    containLandscape = false,
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
      const onCanPlay = () => {
        if (!cancelled) tryPlayActiveRef.current()
      }
      el.addEventListener('canplay', onCanPlay)
      return () => {
        if (cancelled) return
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
      const hls = buildHlsInstance({ prefetch: loadMedia && !isActiveRef.current })
      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(el)
      const onParsed = () => {
        if (cancelled) return
        applyStreamQuality(hls, streamQualityRef.current)
        if (loadMedia && !isActiveRef.current) {
          try {
            hls.startLoad(0)
          } catch {
            /* noop */
          }
        } else {
          requestAnimationFrame(() => reportIntrinsicLayout(el))
          tryPlayActiveRef.current()
        }
      }
      const onLevelSwitch = () => {
        if (cancelled || !isActiveRef.current) return
        requestAnimationFrame(() => reportIntrinsicLayout(el))
      }
      hls.on(Hls.Events.MANIFEST_PARSED, onParsed)
      hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitch)
      return () => {
        cancelled = true
        hls.off(Hls.Events.MANIFEST_PARSED, onParsed)
        hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitch)
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
  }, [loadMedia, videoUrl])

  useEffect(() => {
    const hls = hlsRef.current
    if (hls) applyStreamQuality(hls, streamQuality)
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
    containLandscape && isWideAspect ? 'object-contain' : 'object-cover'
  const boostClass =
    landscapeBoost && isWideAspect && !containLandscape
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
      onTimeUpdate={onPlaybackTick}
      onSeeked={onPlaybackTick}
      onEnded={onPlaybackTick}
      onClick={onClick}
    />
  )
}))
