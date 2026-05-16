import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { VirtualizedFeed } from "./VirtualizedFeed";
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import {
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoPause,
  IoPlay,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
} from "react-icons/io5";
import {
  LuArrowDownFromLine,
  LuFlag,
  LuHeartOff,
  LuPictureInPicture2,
} from "react-icons/lu";

function feedAuthorProfilePath(video) {
  const raw = String(video?.authorUsername ?? "vibely")
    .trim()
    .replace(/^@/, "");
  return raw ? `/@${encodeURIComponent(raw)}` : "";
}

/** Ưu tiên master HLS (.m3u8) nếu có; không thì URL phát thường. */
function feedPlaybackUrl(video) {
  const master = String(video?.masterPlaylistUrl ?? "").trim();
  if (master && /\.m3u8(\?|$)/i.test(master)) return master;
  const direct = String(video?.videoUrl ?? "").trim();
  return direct || null;
}

function feedQualityLabel(mode) {
  if (mode === "720") return "720P";
  if (mode === "540") return "540P";
  return "Tự động";
}

/** Vibely ID + caption dưới video (stacked) hoặc overlay đáy (mặc định). */
function FeedSlideAuthorMeta({
  rawVibelyUser,
  authorProfilePath,
  captionOneLine,
  stacked = false,
}) {
  const nameClass =
    "inline-block max-w-full truncate text-[15px] font-bold leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.85)]";
  const nameEl = authorProfilePath ? (
    <Link
      to={authorProfilePath}
      onClick={(e) => e.stopPropagation()}
      className={`${nameClass} hover:underline`}
    >
      {rawVibelyUser}
    </Link>
  ) : (
    <p className={nameClass}>{rawVibelyUser}</p>
  );

  if (stacked) {
    return (
      <div className="pointer-events-auto shrink-0 border-t border-white/10 bg-black px-3 py-2.5 sm:px-4">
        <div className="inline-flex max-w-full">{nameEl}</div>
        <p className="mt-0.5 line-clamp-2 min-w-0 text-sm leading-snug text-white/90">
          {captionOneLine}
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto bg-linear-to-t from-black/85 via-black/25 to-transparent px-3 pb-6 pt-7 sm:px-4 sm:pb-7 sm:pt-9">
      <div className="inline-flex max-w-full">{nameEl}</div>
      <p className="mt-1 line-clamp-2 min-w-0 text-sm leading-snug text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        {captionOneLine}
      </p>
    </div>
  );
}

/** Cột feed hẹp — video dọc (mặc định, gần TikTok web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT =
  "w-[min(300px,88vw)] shrink-0 md:w-[min(380px,90vw)] lg:w-[min(440px,min(86vw,560px))]";

/** Cột feed rộng — video ~16:9+ (desktop rộng hơn TikTok-web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE =
  "w-[min(390px,92vw)] shrink-0 md:w-[min(560px,94vw)] lg:w-[min(760px,min(94vw,1040px))] xl:w-[min(880px,min(95vw,1180px))]";

/** Video ngang khi panel bình luận mở — thu hẹp để không đè cột action + sidebar. */
export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE_DOCKED =
  "w-[min(280px,68vw)] shrink-0 md:w-[min(340px,42vw)] lg:w-[min(400px,min(38vw,480px))] xl:w-[min(440px,min(36vw,520px))]";

/** Skeleton / chỗ chưa biết tỉ lệ: dùng khung dọc. */
export const FEED_STAGE_OUTER_WIDTH_CLASS = FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

export function FeedPhoneStage({
  videos,
  activeIndex,
  setActiveIndex,
  feedSlotHeightPx,
  virtualFeedRef,
  loadMoreFeed,
  feedVideoRef,
  feedMuted,
  setFeedMuted,
  feedMoreMenuOpen,
  setFeedMoreMenuOpen,
  feedMoreMenuSubpage,
  setFeedMoreMenuSubpage,
  feedVideoQuality,
  setFeedVideoQuality,
  feedAutoScrollEnabled,
  setFeedAutoScrollEnabled,
  feedProgressTrackRef,
  feedProgressPct,
  setFeedProgressPct,
  feedProgressScrubbingRef,
  feedProgressScrubbing,
  setFeedProgressScrubbing,
  seekFeedVideo,
  toggleFeedPlayback,
  toggleFeedPictureInPicture,
  resolveFeedAuthorDisplayName,
  feedDefaultAuthorAvatar,
  thumbnailFallbackUrl,
  playbackFlash,
  onActiveFeedPlaybackTick,
  /** Panel bình luận bên phải đang mở — video ngang thu nhỏ khung. */
  commentsDockOpen = false,
}) {
  /** Khung rộng từ trình duyệt (videoWidth/Height sau decode). */
  const [clientWideForLandscape, setClientWideForLandscape] = useState(false);

  const activeVideo = videos[activeIndex];
  const activeVideoId = activeVideo?.id;
  const sourceW = activeVideo?.sourceWidthPx;
  const sourceH = activeVideo?.sourceHeightPx;
  const apiWideForLandscape =
    sourceW != null &&
    sourceH != null &&
    Number(sourceW) > 0 &&
    Number(sourceH) > 0 &&
    Number(sourceW) >= Number(sourceH);

  /** Tránh callback từ slide cũ (RAF/HLS) ghi đè slide đang active. */
  const activeSlideVideoIdRef = useRef(activeVideoId);
  activeSlideVideoIdRef.current = activeVideoId;

  const onActiveIntrinsicLandscape = useCallback((isLandscape, fromVideoId) => {
    if (fromVideoId == null || fromVideoId !== activeSlideVideoIdRef.current) {
      return;
    }
    setClientWideForLandscape(isLandscape);
  }, []);

  /** useLayoutEffect: reset trước paint để không thua race với useEffect của player con. */
  useLayoutEffect(() => {
    setClientWideForLandscape(false);
  }, [activeIndex, activeVideoId]);

  const stageWideForLandscape = apiWideForLandscape || clientWideForLandscape;

  const stageWidthClass = stageWideForLandscape
    ? commentsDockOpen
      ? FEED_STAGE_OUTER_WIDTH_CLASS_WIDE_DOCKED
      : FEED_STAGE_OUTER_WIDTH_CLASS_WIDE
    : FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

  const stackedLandscapeMeta = stageWideForLandscape && commentsDockOpen;

  return (
    <div
      className={`relative ${stageWidthClass} overflow-visible rounded-xl border border-white/10 bg-black shadow-[0_0_48px_rgba(0,0,0,0.72)] transition-[width,height] duration-200 ease-out sm:rounded-2xl`}
      style={{ height: feedSlotHeightPx }}
    >
      <VirtualizedFeed
        ref={virtualFeedRef}
        videos={videos}
        itemHeightPx={feedSlotHeightPx}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onNearEnd={loadMoreFeed}
        scrollClassName="rounded-xl sm:rounded-2xl"
      >
        {({ video, loadMedia, isActive }) => {
          const poster =
            video.thumbnailUrl?.trim() ||
            thumbnailFallbackUrl ||
            feedDefaultAuthorAvatar;
          const rawVibelyUser = String(video.authorUsername ?? "vibely")
            .trim()
            .replace(/^@/, "");
          const authorProfilePath = feedAuthorProfilePath(video);
          const captionOneLine =
            String(video.description ?? "").trim() ||
            String(video.title ?? "").trim() ||
            "\u00A0";
          const playbackUrl = feedPlaybackUrl(video);
          const hasPlayback = Boolean(playbackUrl);
          const useStackedMeta = stackedLandscapeMeta && isActive && hasPlayback;
          return (
            <div
              className={`relative h-full w-full ${
                useStackedMeta
                  ? "flex flex-col overflow-hidden rounded-xl sm:rounded-2xl"
                  : "overflow-visible"
              } ${isActive ? "group" : ""}`}
            >
              {hasPlayback ? (
                <div
                  className={
                    useStackedMeta
                      ? "relative min-h-0 flex-1 overflow-hidden rounded-xl sm:rounded-2xl"
                      : "absolute inset-x-0 top-0 bottom-3 overflow-hidden rounded-xl sm:rounded-2xl"
                  }
                >
                  <FeedVideoPlayer
                    key={String(video.id)}
                    ref={isActive ? feedVideoRef : undefined}
                    videoUrl={playbackUrl}
                    poster={poster}
                    muted={!isActive || feedMuted}
                    loop
                    loadMedia={loadMedia && hasPlayback}
                    isActive={isActive}
                    feedVideoId={video.id}
                    streamQuality={feedVideoQuality}
                    onPlaybackTick={
                      isActive ? onActiveFeedPlaybackTick : undefined
                    }
                    className="relative z-0 h-full w-full cursor-pointer"
                    containLandscape
                    onClick={toggleFeedPlayback}
                    onIntrinsicLandscape={
                      isActive
                        ? (wide) =>
                            onActiveIntrinsicLandscape(wide, video.id)
                        : undefined
                    }
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-[9] h-[42%] max-h-56 bg-linear-to-b from-black/60 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              ) : (
                <FeedVideoPlayer
                  key={String(video.id)}
                  ref={isActive ? feedVideoRef : undefined}
                  videoUrl={playbackUrl}
                  poster={poster}
                  muted={!isActive || feedMuted}
                  loop
                  loadMedia={loadMedia && hasPlayback}
                  isActive={isActive}
                  feedVideoId={video.id}
                  streamQuality={feedVideoQuality}
                  onPlaybackTick={
                    isActive ? onActiveFeedPlaybackTick : undefined
                  }
                  className="relative z-0 h-full w-full cursor-pointer"
                  containLandscape
                  onClick={toggleFeedPlayback}
                  onIntrinsicLandscape={
                    isActive
                      ? (wide) =>
                          onActiveIntrinsicLandscape(wide, video.id)
                      : undefined
                  }
                />
              )}

              {isActive &&
              hasPlayback &&
              playbackFlash &&
              !feedMoreMenuOpen ? (
                <div
                  className={`pointer-events-none absolute inset-x-0 z-[30] flex items-center justify-center ${
                    useStackedMeta ? "inset-y-0" : "top-0 bottom-3"
                  }`}
                  aria-hidden
                >
                  <div className="feed-playback-flash flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-[2px] sm:h-24 sm:w-24">
                    {playbackFlash === "play" ? (
                      <IoPlay
                        className="ml-1 h-11 w-11 sm:h-14 sm:w-14"
                        aria-hidden
                      />
                    ) : (
                      <IoPause
                        className="h-11 w-11 sm:h-14 sm:w-14"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {isActive && hasPlayback && feedMoreMenuOpen ? (
                <button
                  type="button"
                  aria-label="Đóng menu"
                  className="absolute inset-0 z-[10] cursor-default rounded-xl bg-black/45 transition-colors sm:rounded-2xl"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFeedMoreMenuOpen(false);
                  }}
                />
              ) : null}

              {isActive && hasPlayback ? (
                <>
                  <div
                    className={
                      useStackedMeta
                        ? "pointer-events-none absolute inset-0 z-[11]"
                        : "pointer-events-none absolute inset-x-0 top-0 bottom-3 z-[11] flex flex-col justify-end"
                    }
                  >
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[50] flex items-center justify-between px-3 pt-3">
                    <button
                      type="button"
                      aria-label={feedMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                      className="pointer-events-none cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 hover:bg-black/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeedMuted((m) => !m);
                      }}
                    >
                      {feedMuted ? (
                        <IoVolumeMuteOutline aria-hidden />
                      ) : (
                        <IoVolumeHighOutline aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Menu video"
                      aria-expanded={feedMoreMenuOpen}
                      aria-haspopup="dialog"
                      className={`cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/60 focus-visible:pointer-events-auto focus-visible:opacity-100 ${
                        feedMoreMenuOpen
                          ? "pointer-events-auto opacity-100"
                          : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeedMoreMenuOpen((open) => !open);
                      }}
                    >
                      <IoEllipsisHorizontal aria-hidden />
                    </button>
                  </div>

                  {feedMoreMenuOpen ? (
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Menu video"
                      className="feed-video-more-panel pointer-events-auto absolute top-[64px] right-[6px] z-40 w-[min(232px,calc(100%-12px))] overflow-visible"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute top-[-5px] right-[21px] z-10 h-2.5 w-2.5 rotate-45 rounded-[1px] border-l border-t border-white/18 bg-[rgba(72,72,74,0.92)] shadow-sm"
                      />
                      <div className="overflow-hidden rounded-xl border border-white/18 bg-[rgba(72,72,74,0.92)] py-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                        {feedMoreMenuSubpage === "main" ? (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              onClick={() =>
                                setFeedMoreMenuSubpage("quality")
                              }
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                                HD
                              </span>
                              <span className="min-w-0 flex-1 font-medium">
                                Chất lượng
                              </span>
                              <span className="shrink-0 text-[15px] text-white/55">
                                {feedQualityLabel(feedVideoQuality)}
                              </span>
                              <IoChevronForward
                                className="h-5 w-5 shrink-0 text-white/45"
                                aria-hidden
                              />
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                                CC
                              </span>
                              <span className="font-medium">Phụ đề</span>
                            </button>

                            <div className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-[15px] leading-snug text-white">
                              <LuArrowDownFromLine
                                strokeWidth={1.5}
                                className="h-[22px] w-[22px] shrink-0 text-white"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 font-medium">
                                Cuộn tự động
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={feedAutoScrollEnabled}
                                className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${feedAutoScrollEnabled ? "bg-red-600" : "bg-white/30"}`}
                                onClick={() =>
                                  setFeedAutoScrollEnabled((prev) => !prev)
                                }
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${feedAutoScrollEnabled ? "translate-x-[26px]" : "translate-x-0"}`}
                                />
                              </button>
                            </div>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              onClick={() => void toggleFeedPictureInPicture()}
                            >
                              <LuPictureInPicture2
                                strokeWidth={1.5}
                                className="h-[22px] w-[22px] shrink-0 text-white"
                                aria-hidden
                              />
                              <span className="font-medium">Trình phát nổi</span>
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              onClick={() => setFeedMoreMenuOpen(false)}
                            >
                              <LuHeartOff
                                strokeWidth={1.5}
                                className="h-[22px] w-[22px] shrink-0 text-white"
                                aria-hidden
                              />
                              <span className="font-medium">Không quan tâm</span>
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              onClick={() => setFeedMoreMenuOpen(false)}
                            >
                              <LuFlag
                                strokeWidth={1.5}
                                className="h-[22px] w-[22px] shrink-0 text-white"
                                aria-hidden
                              />
                              <span className="font-medium">Báo cáo</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 border-b border-white/10 px-3 py-2.5 text-left text-[15px] font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              onClick={() =>
                                setFeedMoreMenuSubpage("main")
                              }
                            >
                              <IoChevronBack
                                className="h-5 w-5 shrink-0 text-white"
                                aria-hidden
                              />
                              <span>Chất lượng</span>
                            </button>
                            {["auto", "540", "720"].map((q) => {
                              const selected = feedVideoQuality === q;
                              return (
                                <button
                                  key={q}
                                  type="button"
                                  className={`flex w-full items-center justify-between px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14 ${selected ? "bg-white/12" : ""}`}
                                  onClick={() => {
                                    setFeedVideoQuality(q);
                                    setFeedMoreMenuSubpage("main");
                                  }}
                                >
                                  <span className="font-medium">
                                    {feedQualityLabel(q)}
                                  </span>
                                  {selected ? (
                                    <IoCheckmark
                                      className="h-5 w-5 shrink-0 text-white"
                                      aria-hidden
                                    />
                                  ) : (
                                    <span className="h-5 w-5 shrink-0" aria-hidden />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {!useStackedMeta ? (
                    <FeedSlideAuthorMeta
                      rawVibelyUser={rawVibelyUser}
                      authorProfilePath={authorProfilePath}
                      captionOneLine={captionOneLine}
                    />
                  ) : null}
                </div>

                  {useStackedMeta ? (
                    <FeedSlideAuthorMeta
                      rawVibelyUser={rawVibelyUser}
                      authorProfilePath={authorProfilePath}
                      captionOneLine={captionOneLine}
                      stacked
                    />
                  ) : null}

                  <div
                    ref={feedProgressTrackRef}
                    className={`group/progress pointer-events-auto flex min-h-8 w-full cursor-pointer flex-col justify-end overflow-visible pb-0 ${
                      useStackedMeta
                        ? "relative z-40 shrink-0"
                        : "absolute inset-x-0 bottom-0 z-40"
                    }`}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(feedProgressPct)}
                    aria-label="Tiến độ phát"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      feedProgressScrubbingRef.current = true;
                      setFeedProgressScrubbing(true);
                      seekFeedVideo(e.clientX, feedProgressTrackRef.current);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      feedProgressScrubbingRef.current = true;
                      setFeedProgressScrubbing(true);
                      const cx = e.touches[0]?.clientX;
                      if (cx != null)
                        seekFeedVideo(cx, feedProgressTrackRef.current);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight")
                        return;
                      e.preventDefault();
                      const el = feedVideoRef.current;
                      if (!el?.duration || !Number.isFinite(el.duration))
                        return;
                      const delta = e.key === "ArrowLeft" ? -5 : 5;
                      el.currentTime = Math.min(
                        el.duration,
                        Math.max(0, el.currentTime + delta),
                      );
                      setFeedProgressPct((el.currentTime / el.duration) * 100);
                    }}
                  >
                    <div className="relative flex w-full items-end pb-0 pt-1">
                      <div className="relative h-[4px] w-full transition-[height] duration-150 ease-out group-hover/progress:h-[6px]">
                        <div className="absolute inset-0 rounded-full bg-white/30" />
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full bg-red-600 ${feedProgressScrubbing ? "" : "transition-[width] duration-150 ease-out"}`}
                          style={{
                            width: `${feedProgressPct}%`,
                            maxWidth: "100%",
                          }}
                        />
                        <div
                          className={`pointer-events-none absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-out ${feedProgressScrubbing ? "opacity-100" : "opacity-0 group-hover/progress:opacity-100"}`}
                          style={{ left: `${feedProgressPct}%` }}
                          aria-hidden
                        >
                          <div className="h-full w-full rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ring-2 ring-black/25 transition-transform duration-200 ease-out group-hover/progress:scale-110" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : !hasPlayback ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4">
                  <p className="truncate text-sm font-semibold text-white">
                    @{rawVibelyUser}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-300">
                    {captionOneLine}
                  </p>
                </div>
              ) : null}
            </div>
          );
        }}
      </VirtualizedFeed>
    </div>
  );
}
