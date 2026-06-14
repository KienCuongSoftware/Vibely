import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import {
  FeedPhoneStage,
  FEED_STAGE_OUTER_WIDTH_CLASS,
} from "./FeedPhoneStage";
import { FeedCommentsPanel } from "./FeedCommentsPanel.jsx";
import { Sidebar } from "../Sidebar";
import { TooltipHoverWrap } from "../TooltipControls";
import { AccountActionsPill } from "../AccountActionsPill";
import { VideoShareModal } from "../VideoShareModal";
import {
  BookmarkCollectionPopover,
  BookmarkSaveToast,
  NewCollectionModal,
} from "../BookmarkSaveFeedback";
import { usePersistedFeedPlaybackSpeed } from "../../feed/usePersistedFeedPlaybackSpeed.js";
import { usePersistedFeedVideoQuality } from "../../feed/usePersistedFeedVideoQuality.js";
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from "../../utils/watchQualifiesForViewRecord";
import { useRapidStepNavigation } from "../../hooks/useRapidStepNavigation.js";
import {
  IoArrowRedo,
  IoBookmark,
  IoChevronDown,
  IoChevronUp,
  IoCheckmark,
  IoHeart,
  IoLogOutOutline,
  IoPerson,
  IoVideocam,
} from "react-icons/io5";
import { FaComment } from "react-icons/fa6";
import { MdOutlineFileUpload } from "react-icons/md";
import { buildShareableVideoUrl } from "../../utils/shareUrl.js";
import {
  buildProfileVideoUrl,
  buildVideoWatchUrl,
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from "../../utils/videoPublicId.js";
import { FEED_CONFIG } from "../../feed/feedConfig.js";
import { FEED_ROUND_ICON_BUTTON_CLASS } from "../../feed/feedLayout.js";
import { trimFeedItemsIfNeeded } from "../../feed/trimFeedItems.js";
import {
  readFeedFollowedAuthorIds,
  writeFeedFollowedAuthorIds,
  filterVideosFromFollowedCreators,
} from "../../utils/feedFollowState.js";
import { handleSidebarMenuSelect } from "../../utils/sidebarNavigation.js";
import { buildProfilePath } from "../../utils/buildProfilePath.js";
import { buildMainSidebarMenuItems } from "../../utils/mainSidebarMenuItems.js";
import { recordProfileLastWatchedFromVideo } from "../../utils/profileLastWatched.js";
import { AvatarImage, DEFAULT_AVATAR_URL } from "../AvatarImage.jsx";
import { sanitizeAvatarUrl } from "../../utils/avatarUrl.js";

const DEFAULT_USER_AVATAR_URL = DEFAULT_AVATAR_URL;

function formatCompactCount(value) {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    const formatted =
      count >= 10_000 ? (count / 1_000).toFixed(0) : (count / 1_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}K`;
  }
  return String(count);
}

function resolveFeedAuthorDisplayName(video) {
  const name = String(video?.authorDisplayName ?? "").trim();
  if (name) return name;
  const fallback = String(video?.authorUsername ?? "")
    .trim()
    .replace(/^@/, "");
  return fallback || "Nhà sáng tạo";
}

function feedAuthorProfilePath(video) {
  const raw = String(video?.authorUsername ?? "")
    .trim()
    .replace(/^@/, "");
  return raw ? `/@${encodeURIComponent(raw)}` : "";
}

function mergeVideosByPublicId(prev, incoming) {
  const seen = new Set(prev.map((v) => videoPublicIdOf(v)).filter(Boolean));
  const out = [...prev];
  for (const raw of incoming) {
    const item = normalizeVideoItem(raw);
    const id = videoPublicIdOf(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/** Avatar tác giả từ API; không dùng pravatar (tránh lệch với hồ sơ thật). */
const FEED_DEFAULT_AUTHOR_AVATAR = "/images/users/default-avatar.jpeg";

function resolveVideoAuthorAvatar(item) {
  return sanitizeAvatarUrl(item?.authorAvatarUrl, FEED_DEFAULT_AUTHOR_AVATAR);
}

function formatRelativeTimeVi(isoOrMs) {
  if (isoOrMs == null) return "";
  const d =
    typeof isoOrMs === "string" || typeof isoOrMs === "number"
      ? new Date(isoOrMs)
      : isoOrMs;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

const FEED_ROUND_ICON_BUTTON = FEED_ROUND_ICON_BUTTON_CLASS;

function normalizeVideoItem(item) {
  return {
    ...item,
    authorId:
      item?.authorId == null || Number.isNaN(Number(item.authorId))
        ? null
        : Number(item.authorId),
    authorDisplayName:
      item.authorDisplayName != null &&
      String(item.authorDisplayName).trim()
        ? String(item.authorDisplayName).trim()
        : undefined,
    avatarUrl: resolveVideoAuthorAvatar(item),
    isAuthorFollowed: Boolean(item?.followedByViewer || item?.isAuthorFollowed),
    shareCount: Number(item.shareCount ?? 0),
    bookmarkCount: Number(item.bookmarkCount ?? 0),
  };
}

function FeedChevronNav({ activeIndex, videoCount, onStep, busy }) {
  return (
    <div className="ml-2 flex shrink-0 flex-col justify-center gap-2.5 self-center sm:ml-3">
      <button
        type="button"
        aria-label="Video trước"
        className={FEED_ROUND_ICON_BUTTON}
        disabled={busy || activeIndex === 0}
        onClick={() => onStep(-1)}
      >
        <IoChevronUp aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Video tiếp theo"
        className={FEED_ROUND_ICON_BUTTON}
        disabled={busy || activeIndex >= videoCount - 1}
        onClick={() => onStep(1)}
      >
        <IoChevronDown aria-hidden />
      </button>
    </div>
  );
}

export function VerticalVideoFeed({ token, user, onLogout, authReady, feedMode = "latest", activeMenuId = "latest" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isFollowingFeed = feedMode === "following";
  const studioNavRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [followingPage, setFollowingPage] = useState(0);
  const loadMoreLockRef = useRef(false);
  const virtualFeedRef = useRef(null);

  const [feedStepBusy, setFeedStepBusy] = useState(false);
  const feedStepBusyRef = useRef(false);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const moveFeedBySteps = useCallback(
    (steps) => {
      if (!steps || feedStepBusyRef.current) return;
      const max = Math.max(0, videos.length - 1);
      const target = Math.min(
        Math.max(0, activeIndexRef.current + steps),
        max,
      );
      if (target === activeIndexRef.current) return;

      feedStepBusyRef.current = true;
      setFeedStepBusy(true);

      const finish = () => {
        feedStepBusyRef.current = false;
        setFeedStepBusy(false);
      };

      if (virtualFeedRef.current?.smoothScrollToIndex) {
        virtualFeedRef.current.smoothScrollToIndex(target, {
          onComplete: finish,
        });
        return;
      }

      setActiveIndex(target);
      queueMicrotask(() => virtualFeedRef.current?.scrollToIndex(target));
      window.setTimeout(finish, 320);
    },
    [videos.length],
  );

  const { requestStep: requestFeedStep, reset: resetFeedStepPending } =
    useRapidStepNavigation({
      onStep: moveFeedBySteps,
      delayMs: 200,
      maxBurst: 4,
      cooldownMs: 280,
    });

  useEffect(() => {
    resetFeedStepPending();
  }, [activeIndex, resetFeedStepPending]);
  /** Chừa ít px trên/dưới — video gần full viewport như TikTok web. */
  const computeFeedSlotHeight = useCallback(() => {
    if (typeof window === "undefined") return 760;
    const insetPx = 12;
    return Math.max(320, Math.round(window.innerHeight - insetPx * 2));
  }, []);
  const [feedSlotHeightPx, setFeedSlotHeightPx] = useState(() =>
    typeof window === "undefined" ? 760 : computeFeedSlotHeight(),
  );
  useEffect(() => {
    setFeedSlotHeightPx(computeFeedSlotHeight());
    const onResize = () => setFeedSlotHeightPx(computeFeedSlotHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFeedSlotHeight]);
  const [activeMenu, setActiveMenu] = useState(activeMenuId);

  useEffect(() => {
    setActiveMenu(activeMenuId);
  }, [activeMenuId]);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [bookmarkToastOpen, setBookmarkToastOpen] = useState(false);
  const [bookmarkManageOpen, setBookmarkManageOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const bookmarkButtonRef = useRef(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const accountMenuRef = useRef(null);
  const feedVideoRef = useRef(null);
  /** 0–1; khi bật tiếng dùng max. */
  const [feedVolume, setFeedVolume] = useState(1);
  /** Tắt tiếng mặc định để autoplay ổn định (TikTok-style). */
  const [feedSoundOn, setFeedSoundOn] = useState(false);
  const feedMuted = !feedSoundOn || feedVolume === 0;
  /** Trình duyệt chỉ cho autoplay có tiếng sau gesture — tạm mute đến khi user chạm/click. */
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const playbackMuted = feedMuted || (feedSoundOn && !soundUnlocked);
  const [feedMoreMenuOpen, setFeedMoreMenuOpen] = useState(false);
  /** 'main' | 'quality' — màn phụ chọn chất lượng trong menu ⋯ */
  const [feedMoreMenuSubpage, setFeedMoreMenuSubpage] = useState("main");
  /** HLS: 'auto' | '540' | '720' (hls.js); Safari native HLS không đổi rendition qua UI này */
  const [feedVideoQuality, setFeedVideoQuality] = usePersistedFeedVideoQuality();
  const [feedPlaybackSpeed, setFeedPlaybackSpeed] = usePersistedFeedPlaybackSpeed();
  const [feedAutoScrollEnabled, setFeedAutoScrollEnabled] = useState(false);
  const [feedPaused, setFeedPaused] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [feedCommentsOpen, setFeedCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [feedComments, setFeedComments] = useState([]);
  const [feedCommentsLoading, setFeedCommentsLoading] = useState(false);
  const [feedCommentsError, setFeedCommentsError] = useState("");
  const [commentPostError, setCommentPostError] = useState("");
  const [followBusyAuthorId, setFollowBusyAuthorId] = useState(null);
  const [followSuccessPublicId, setFollowSuccessPublicId] = useState(null);
  const [followedAuthorIds, setFollowedAuthorIds] = useState(() =>
    readFeedFollowedAuthorIds(token),
  );
  const feedViewQualifySentRef = useRef(new Set());
  const feedViewPlaythroughSentRef = useRef(new Set());
  const playbackFlashTimerRef = useRef(null);
  const followBadgeTimerRef = useRef(null);

  useEffect(() => {
    const unlock = () => setSoundUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    return () =>
      window.removeEventListener("pointerdown", unlock, { capture: true });
  }, []);

  useEffect(() => {
    setFollowedAuthorIds(readFeedFollowedAuthorIds(token));
  }, [token]);

  useEffect(() => {
    if (followedAuthorIds.size === 0) return;
    setVideos((prev) => {
      let changed = false;
      const next = prev.map((video) => {
        const authorId = Number(video?.authorId);
        if (
          Number.isFinite(authorId) &&
          followedAuthorIds.has(authorId) &&
          !video?.isAuthorFollowed
        ) {
          changed = true;
          return { ...video, isAuthorFollowed: true };
        }
        return video;
      });
      return changed ? next : prev;
    });
  }, [followedAuthorIds, videos]);

  useEffect(
    () => () => {
      if (followBadgeTimerRef.current != null) {
        clearTimeout(followBadgeTimerRef.current);
      }
    },
    [],
  );
  /** TikTok-style: brief center icon after tap — 'play' | 'pause' */
  const [playbackFlash, setPlaybackFlash] = useState(null);
  /** false cho đến khi lần fetch feed (theo token/menu/location) chạy xong — tránh flash “feed trống” khi reload. */
  const [feedHydrated, setFeedHydrated] = useState(false);

  const activeVideo = videos[activeIndex] ?? null;
  const [stageWide, setStageWide] = useState(false);
  /** Chỉ video ngang căn trái; video dọc luôn giữa (kể cả khi mở bình luận). */
  const feedAlignStart = stageWide && !feedCommentsOpen;
  const feedDockLandscape = feedCommentsOpen && stageWide;
  const activeAuthorProfilePath = useMemo(
    () => feedAuthorProfilePath(activeVideo),
    [activeVideo],
  );

  useEffect(() => {
    recordProfileLastWatchedFromVideo(activeVideo, { tab: "videos" });
  }, [activeVideo?.publicId, activeVideo?.authorUsername]);

  useEffect(() => {
    const id =
      activeVideo?.publicId != null && isVideoPublicId(activeVideo.publicId)
        ? String(activeVideo.publicId)
        : null;
    return () => {
      if (id != null) {
        feedViewQualifySentRef.current.delete(id);
        feedViewPlaythroughSentRef.current.delete(id);
      }
    };
  }, [activeVideo?.publicId]);

  useEffect(() => {
    setPlaybackFlash(null);
    if (playbackFlashTimerRef.current != null) {
      clearTimeout(playbackFlashTimerRef.current);
      playbackFlashTimerRef.current = null;
    }
  }, [activeVideo?.publicId]);

  useEffect(
    () => () => {
      if (playbackFlashTimerRef.current != null) {
        clearTimeout(playbackFlashTimerRef.current);
      }
    },
    [],
  );

  const patchVideoByPublicId = useCallback((publicId, patch) => {
    const key = normalizeVideoPublicId(publicId);
    if (!key) return;
    setVideos((prev) =>
      prev.map((v) =>
        videoPublicIdOf(v) === key ? { ...v, ...patch } : v,
      ),
    );
  }, []);

  const patchVideosByAuthorId = useCallback((authorId, patch) => {
    const key = Number(authorId);
    if (!Number.isFinite(key)) return;
    setVideos((prev) =>
      prev.map((video) =>
        Number(video?.authorId) === key ? { ...video, ...patch } : video,
      ),
    );
  }, []);

  const markAuthorFollowedInSession = useCallback(
    (authorId) => {
      const key = Number(authorId);
      if (!Number.isFinite(key) || key <= 0) return;
      setFollowedAuthorIds((prev) => {
        const next = new Set(prev);
        next.add(key);
        writeFeedFollowedAuthorIds(token, next);
        return next;
      });
    },
    [token],
  );

  const hydrateFeedFollowState = useCallback(
    (items) =>
      items.map((item) => {
        const normalized = normalizeVideoItem(item);
        const authorId = Number(normalized?.authorId);
        if (Number.isFinite(authorId) && followedAuthorIds.has(authorId)) {
          return { ...normalized, isAuthorFollowed: true };
        }
        return normalized;
      }),
    [followedAuthorIds],
  );

  const prepareFollowingFeedChunk = useCallback(
    (items) => {
      const hydrated = hydrateFeedFollowState(items);
      if (!isFollowingFeed) return hydrated;
      return filterVideosFromFollowedCreators(hydrated, followedAuthorIds);
    },
    [hydrateFeedFollowState, isFollowingFeed, followedAuthorIds],
  );

  const startFollowSuccessFlash = useCallback((publicId) => {
    const key = normalizeVideoPublicId(publicId);
    if (!key) return;
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current);
    }
    setFollowSuccessPublicId(key);
    followBadgeTimerRef.current = setTimeout(() => {
      setFollowSuccessPublicId((current) => (current === key ? null : current));
      followBadgeTimerRef.current = null;
    }, 500);
  }, []);

  const clearFollowSuccessFlash = useCallback((publicId) => {
    const key = normalizeVideoPublicId(publicId);
    if (!key) return;
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current);
      followBadgeTimerRef.current = null;
    }
    setFollowSuccessPublicId((current) => (current === key ? null : current));
  }, []);

  const showActiveAuthorFollowBadge = useMemo(() => {
    if (!activeVideo) return false;
    const authorId = Number(activeVideo.authorId);
    if (!Number.isFinite(authorId) || authorId <= 0) return false;
    if (Number(user?.id) === authorId) return false;
    return !Boolean(activeVideo.isAuthorFollowed);
  }, [activeVideo, user?.id]);

  const showActiveAuthorFollowSuccess = useMemo(() => {
    return (
      normalizeVideoPublicId(activeVideo?.publicId) != null &&
      normalizeVideoPublicId(activeVideo?.publicId) === followSuccessPublicId
    );
  }, [activeVideo?.publicId, followSuccessPublicId]);

  const handleActiveAuthorFollow = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const authorId = Number(activeVideo?.authorId);
      const publicId = normalizeVideoPublicId(activeVideo?.publicId);
      if (!Number.isFinite(authorId) || authorId <= 0) return;
      if (!publicId) return;
      if (Number(user?.id) === authorId) return;
      if (!token) {
        navigate("/login");
        return;
      }
      if (followBusyAuthorId === authorId) return;

      setFollowBusyAuthorId(authorId);
      markAuthorFollowedInSession(authorId);
      patchVideosByAuthorId(authorId, { isAuthorFollowed: true });
      startFollowSuccessFlash(publicId);
      try {
        await apiClient.follow(authorId, token);
      } catch {
        clearFollowSuccessFlash(publicId);
        patchVideosByAuthorId(authorId, { isAuthorFollowed: false });
      } finally {
        setFollowBusyAuthorId(null);
      }
    },
    [
      activeVideo?.authorId,
      activeVideo?.publicId,
      clearFollowSuccessFlash,
      followBusyAuthorId,
      markAuthorFollowedInSession,
      navigate,
      patchVideosByAuthorId,
      startFollowSuccessFlash,
      token,
      user?.id,
    ],
  );

  const openBookmarkManagePopover = useCallback(() => {
    setBookmarkToastOpen(false);
    setBookmarkManageOpen(true);
  }, []);

  const openNewCollectionModal = useCallback(() => {
    setBookmarkManageOpen(false);
    setNewCollectionOpen(true);
  }, []);

  const handleBookmarkToggle = useCallback(() => {
    if (!token || !isVideoPublicId(activeVideo?.publicId)) {
      setBookmarked((prev) => !prev);
      return;
    }
    const next = !bookmarked;
    const prevBm = Number(activeVideo.bookmarkCount ?? 0);
    setBookmarked(next);
    patchVideoByPublicId(activeVideo.publicId, {
      bookmarkCount: Math.max(0, prevBm + (next ? 1 : -1)),
    });
    if (next) {
      setBookmarkToastOpen(true);
    } else {
      setBookmarkToastOpen(false);
      setBookmarkManageOpen(false);
    }
    const req = next
      ? apiClient.bookmarkVideo(activeVideo.publicId, token)
      : apiClient.unbookmarkVideo(activeVideo.publicId, token);
    req.catch(() => {
      setBookmarked(!next);
      patchVideoByPublicId(activeVideo.publicId, { bookmarkCount: prevBm });
      if (next) setBookmarkToastOpen(false);
    });
  }, [token, activeVideo, bookmarked, patchVideoByPublicId]);

  const loadMoreFeed = useCallback(async () => {
    if (!hasMoreFeed || loadMoreLockRef.current) return;
    if (!isFollowingFeed && !nextCursor) return;
    loadMoreLockRef.current = true;
    try {
      if (isFollowingFeed) {
        const nextPage = followingPage + 1;
        const response = await apiClient.getFollowingFeed(token, {
          page: nextPage,
          size: FEED_CONFIG.PAGE_SIZE,
        });
        const items = response?.items ?? [];
        const chunk = prepareFollowingFeedChunk(items);
        setVideos((prev) => {
          const merged = mergeVideosByPublicId(prev, chunk);
          const trimmed = trimFeedItemsIfNeeded(merged, activeIndex);
          if (trimmed.activeIndex !== activeIndex) {
            queueMicrotask(() => setActiveIndex(trimmed.activeIndex));
          }
          return trimmed.items;
        });
        setFollowingPage(nextPage);
        setHasMoreFeed(Boolean(response?.hasNext));
        return;
      }

      const response = await apiClient.getFeed({
        size: FEED_CONFIG.PAGE_SIZE,
        sort: "latest",
        cursor: nextCursor,
        token,
      });
      const items = response?.items ?? [];
      const chunk = hydrateFeedFollowState(items);
      setVideos((prev) => {
        const merged = mergeVideosByPublicId(prev, chunk);
        const trimmed = trimFeedItemsIfNeeded(merged, activeIndex);
        if (trimmed.activeIndex !== activeIndex) {
          queueMicrotask(() => setActiveIndex(trimmed.activeIndex));
        }
        return trimmed.items;
      });
      setHasMoreFeed(Boolean(response?.hasNext));
      setNextCursor(response?.nextCursor ?? null);
    } catch {
      /* ignore */
    } finally {
      loadMoreLockRef.current = false;
    }
  }, [
    isFollowingFeed,
    hasMoreFeed,
    nextCursor,
    followingPage,
    activeIndex,
    prepareFollowingFeedChunk,
    token,
  ]);

  useEffect(() => {
    const raw =
      location.state?.focusVideoPublicId ?? location.state?.focusVideoId;
    if (raw == null && location.state?.openComments == null) return;
    studioNavRef.current = {
      publicId: normalizeVideoPublicId(raw),
      openComments: Boolean(location.state?.openComments),
    };
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!authReady) return undefined;

    let isMounted = true;
    setFeedHydrated(false);
    setVideos([]);
    setActiveIndex(0);
    setFeedCommentsOpen(false);
    setFeedMoreMenuOpen(false);
    setFollowingPage(0);
    setNextCursor(null);
    setHasMoreFeed(false);
    const params = new URLSearchParams(location.search);
    const rawV = params.get("v");
    let queryFocusId = null;
    let queryOpenComments = false;
    if (rawV != null) {
      queryFocusId = normalizeVideoPublicId(rawV);
      if (queryFocusId) {
        queryOpenComments = params.get("comments") === "1";
      }
      const path = location.pathname;
      queueMicrotask(() =>
        navigate({ pathname: path, search: "" }, { replace: true }),
      );
    }

    const pending = studioNavRef.current;
    if (pending != null) {
      studioNavRef.current = null;
    }
    const focusId = pending?.publicId ?? queryFocusId;
    const openComments =
      Boolean(pending?.openComments) || queryOpenComments;

    (async () => {
      try {
        if (isFollowingFeed) {
          if (!token) {
            if (!isMounted) return;
            setVideos([]);
            setActiveIndex(0);
            setNextCursor(null);
            setHasMoreFeed(false);
            return;
          }
          const response = await apiClient.getFollowingFeed(token, {
            page: 0,
            size: FEED_CONFIG.PAGE_SIZE,
          });
          const items = response?.items ?? [];
          if (!isMounted) return;
          setVideos(prepareFollowingFeedChunk(items));
          setActiveIndex(0);
          setFollowingPage(0);
          setNextCursor(null);
          setHasMoreFeed(Boolean(response?.hasNext));
          return;
        }

        const request = apiClient.getFeed({
          size: FEED_CONFIG.PAGE_SIZE,
          sort: "latest",
          token,
        });

        try {
          const response = await request;
          const items = response?.items ?? [];
          if (!isMounted) return;

          let normalized = hydrateFeedFollowState(items);

          if (items.length === 0) {
            if (focusId != null) {
              try {
                const one = await apiClient.getVideo(focusId, { token });
                const focusNorm = hydrateFeedFollowState([one])[0];
                normalized = [focusNorm];
                const idx = 0;
                setActiveIndex(idx);
                if (openComments) setFeedCommentsOpen(true);
                queueMicrotask(() => virtualFeedRef.current?.scrollToIndex(idx));
                setVideos(normalized);
                setNextCursor(null);
                setHasMoreFeed(false);
                return;
              } catch {
                /* fall through */
              }
            }
            if (token) {
              try {
                const mine = await apiClient.getMyUploadedVideos(token, {
                  page: 0,
                  size: 16,
                });
                const mineItems = Array.isArray(mine?.items) ? mine.items : [];
                if (mineItems.length > 0) {
                  normalized = hydrateFeedFollowState(mineItems);
                  setActiveIndex(0);
                  setVideos(normalized);
                  setNextCursor(null);
                  setHasMoreFeed(Boolean(mine?.hasNext));
                  return;
                }
              } catch {
                /* fall through */
              }
              setActiveIndex(0);
              setVideos([]);
              setNextCursor(null);
              setHasMoreFeed(false);
              return;
            }
            setVideos([]);
            setNextCursor(null);
            setHasMoreFeed(false);
            return;
          }

          if (focusId != null) {
            const has = normalized.some(
              (v) => videoPublicIdOf(v) === focusId,
            );
            if (!has) {
              try {
                const one = await apiClient.getVideo(focusId, { token });
                const focusNorm = hydrateFeedFollowState([one])[0];
                normalized = [focusNorm, ...normalized];
              } catch {
                /* không tải được video (đã gỡ / lỗi mạng) */
              }
            }
            const idx = normalized.findIndex(
              (v) => videoPublicIdOf(v) === focusId,
            );
            if (idx >= 0) {
              setActiveIndex(idx);
              if (openComments) setFeedCommentsOpen(true);
              queueMicrotask(() => virtualFeedRef.current?.scrollToIndex(idx));
            }
          }

          setVideos(normalized);
          setHasMoreFeed(Boolean(response?.hasNext));
          setNextCursor(response?.nextCursor ?? null);
        } catch {
          if (isMounted) {
            if (token) {
              try {
                const mine = await apiClient.getMyUploadedVideos(token, {
                  page: 0,
                  size: 16,
                });
                const mineItems = Array.isArray(mine?.items) ? mine.items : [];
                if (mineItems.length > 0) {
                  setVideos(hydrateFeedFollowState(mineItems));
                  setHasMoreFeed(Boolean(mine?.hasNext));
                  setNextCursor(null);
                  return;
                }
              } catch {
                /* noop */
              }
              setVideos([]);
            } else {
              setVideos([]);
            }
            setNextCursor(null);
            setHasMoreFeed(false);
          }
        }
      } finally {
        if (isMounted) setFeedHydrated(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authReady, token, location.pathname, location.key, navigate, hydrateFeedFollowState, prepareFollowingFeedChunk, feedMode, isFollowingFeed]);

  useEffect(() => {
    setActiveIndex((idx) => {
      if (videos.length === 0) return 0;
      return Math.min(Math.max(0, idx), videos.length - 1);
    });
  }, [videos]);

  useEffect(() => {
    if (videos.length === 0) {
      setFeedCommentsOpen(false);
      setFeedMoreMenuOpen(false);
    }
  }, [videos.length]);

  useEffect(() => {
    setLiked(false);
    setBookmarked(false);
    setShareModalOpen(false);
    setBookmarkToastOpen(false);
    setBookmarkManageOpen(false);
    setFeedMoreMenuOpen(false);
  }, [activeIndex]);

  const handleVideoContextShare = useCallback(
    (video) => {
      const targetId = videoPublicIdOf(video);
      if (!targetId) return;
      const idx = videos.findIndex((item) => videoPublicIdOf(item) === targetId);
      if (idx >= 0 && idx !== activeIndexRef.current) {
        setActiveIndex(idx);
      }
      setShareModalOpen(true);
    },
    [videos],
  );

  const handleVideoContextCopyLink = useCallback(async (video) => {
    const url = buildShareableVideoUrl(video?.publicId, video?.authorUsername);
    if (!url) return;
    await navigator.clipboard.writeText(url);
  }, []);

  const handleVideoContextViewDetails = useCallback(
    (video) => {
      const path =
        buildProfileVideoUrl(video?.authorUsername, video?.publicId) ||
        buildVideoWatchUrl(video?.publicId);
      if (!path) return;
      if (path.startsWith("http")) {
        window.location.assign(path);
        return;
      }
      navigate(path);
    },
    [navigate],
  );

  useEffect(() => {
    if (!authReady || !token || !isVideoPublicId(activeVideo?.publicId)) {
      return;
    }
    let cancelled = false;
    apiClient
      .getVideoMeState(activeVideo.publicId, token)
      .then((s) => {
        if (!cancelled) {
          setLiked(Boolean(s?.liked));
          setBookmarked(Boolean(s?.bookmarked));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiked(false);
          setBookmarked(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, token, activeVideo?.publicId]);

  useEffect(() => {
    setCommentDraft("");
    setFeedComments([]);
    setFeedCommentsError("");
    setCommentPostError("");
  }, [activeIndex]);

  useEffect(() => {
    if (!feedCommentsOpen || !isVideoPublicId(activeVideo?.publicId)) {
      return undefined;
    }
    let cancelled = false;
    const vid = activeVideo.publicId;
    setFeedCommentsLoading(true);
    setFeedCommentsError("");
    apiClient
      .getComments(vid, { token })
      .then((list) => {
        if (!cancelled) {
          setFeedComments(
            (Array.isArray(list) ? list : []).map((row) => ({
              ...row,
              likeCount: Number(row?.likeCount ?? 0),
              likedByViewer: Boolean(row?.likedByViewer),
            })),
          );
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFeedCommentsError(
            e instanceof Error ? e.message : "Không tải được bình luận.",
          );
          setFeedComments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFeedCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feedCommentsOpen, activeVideo?.publicId, token]);

  useEffect(() => {
    if (!feedCommentsOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setFeedCommentsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedCommentsOpen]);

  useEffect(() => {
    if (!feedMoreMenuOpen) {
      setFeedMoreMenuSubpage("main");
    }
  }, [feedMoreMenuOpen]);

  useEffect(() => {
    if (!feedMoreMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (feedMoreMenuSubpage === "quality" || feedMoreMenuSubpage === "speed") {
        setFeedMoreMenuSubpage("main");
      } else {
        setFeedMoreMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedMoreMenuOpen, feedMoreMenuSubpage]);

  const onActiveFeedPlaybackTick = useCallback((e) => {
    const el = e.currentTarget;
    if (!el || el.tagName !== "VIDEO") return;
    const idAttr = el.getAttribute("data-feed-video-id");
    if (idAttr == null || !String(idAttr).trim()) return;

    let dur = el.duration;
    if (!Number.isFinite(dur) || dur <= 0) {
      try {
        if (el.seekable?.length) {
          dur = el.seekable.end(el.seekable.length - 1);
        }
      } catch {
        /* noop */
      }
    }
    const id = String(idAttr);
    if (!isVideoPublicId(id)) return;

    const watchedMs = Math.floor(el.currentTime * 1000);
    const durationMs =
      Number.isFinite(dur) && dur > 0 ? Math.floor(dur * 1000) : null;

    if (
      durationMs != null &&
      !feedViewPlaythroughSentRef.current.has(id) &&
      watchTimeNearPlaythroughEnd(watchedMs, durationMs)
    ) {
      feedViewPlaythroughSentRef.current.add(id);
      apiClient
        .recordVideoView(id, {
          watchedMs,
          durationMs,
        }, { token })
        .catch(() => {
          feedViewPlaythroughSentRef.current.delete(id);
        });
      return;
    }

    if (feedViewQualifySentRef.current.has(id)) return;
    if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return;
    feedViewQualifySentRef.current.add(id);
    apiClient
      .recordVideoView(id, {
        watchedMs,
        ...(durationMs != null ? { durationMs } : {}),
      }, { token })
      .catch(() => {
        feedViewQualifySentRef.current.delete(id);
      });
  }, [token]);

  const autoAdvanceAfterLoadRef = useRef(false);

  const onActiveFeedPlaybackEnded = useCallback(() => {
    if (!feedAutoScrollEnabled || userPaused || feedCommentsOpen) return;
    if (activeIndex < videos.length - 1) {
      moveFeedBySteps(1);
      return;
    }
    if (!hasMoreFeed) return;
    autoAdvanceAfterLoadRef.current = true;
    void loadMoreFeed();
  }, [
    feedAutoScrollEnabled,
    userPaused,
    feedCommentsOpen,
    activeIndex,
    videos.length,
    hasMoreFeed,
    loadMoreFeed,
    moveFeedBySteps,
  ]);

  useEffect(() => {
    if (!autoAdvanceAfterLoadRef.current) return;
    if (!feedAutoScrollEnabled || userPaused || feedCommentsOpen) {
      autoAdvanceAfterLoadRef.current = false;
      return;
    }
    if (activeIndex < videos.length - 1) {
      autoAdvanceAfterLoadRef.current = false;
      moveFeedBySteps(1);
    }
  }, [
    videos.length,
    activeIndex,
    feedAutoScrollEnabled,
    userPaused,
    feedCommentsOpen,
    moveFeedBySteps,
  ]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el) return;
    const v = Math.min(1, Math.max(0, feedVolume));
    el.volume = v;
    el.muted = playbackMuted;
  }, [feedVolume, playbackMuted, activeIndex, activeVideo?.publicId]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el) return;
    const rate = Number(feedPlaybackSpeed);
    el.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  }, [feedPlaybackSpeed, activeIndex, activeVideo?.publicId]);

  useEffect(() => {
    if (!soundUnlocked) return undefined;
    const el = feedVideoRef.current;
    if (!el) return undefined;
    el.muted = playbackMuted;
    el.volume = Math.min(1, Math.max(0, feedVolume));
    if (!userPaused) {
      void el.play().catch(() => {});
    }
    return undefined;
  }, [soundUnlocked, playbackMuted, feedVolume, activeVideo?.publicId, userPaused]);

  useEffect(() => {
    setUserPaused(false);
  }, [activeIndex, activeVideo?.publicId]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo?.videoUrl) return undefined;
    const onPlay = () => setFeedPaused(false);
    const onPause = () => setFeedPaused(true);
    const sync = () => setFeedPaused(el.paused);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("playing", onPlay);
    el.addEventListener("loadeddata", sync);
    sync();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("playing", onPlay);
      el.removeEventListener("loadeddata", sync);
    };
  }, [activeIndex, activeVideo?.publicId, activeVideo?.videoUrl]);

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowAccountMenu(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!showLogoutConfirm) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLogoutConfirm]);

  const mainMenuItems = useMemo(
    () => buildMainSidebarMenuItems(token),
    [token],
  );

  const handleSidebarSelect = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: buildProfilePath(token, user),
      onUnhandled: (menuId) => setActiveMenu(menuId),
    });
  };

  const toggleFeedPlayback = useCallback(() => {
    const el = feedVideoRef.current;
    if (!el) return;
    const wasPaused = el.paused;
    if (wasPaused) {
      setUserPaused(false);
      void el.play().catch(() => {});
      setPlaybackFlash("play");
    } else {
      setUserPaused(true);
      el.pause();
      setPlaybackFlash("pause");
    }
    if (playbackFlashTimerRef.current != null) {
      clearTimeout(playbackFlashTimerRef.current);
    }
    playbackFlashTimerRef.current = setTimeout(() => {
      setPlaybackFlash(null);
      playbackFlashTimerRef.current = null;
    }, 620);
  }, []);

  const toggleFeedPictureInPicture = async () => {
    const el = feedVideoRef.current;
    if (!el || typeof el.requestPictureInPicture !== "function") return;
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture?.();
      } else {
        await el.requestPictureInPicture();
      }
      setFeedMoreMenuOpen(false);
    } catch {
      /* PiP không khả dụng hoặc trình duyệt chặn */
    }
  };

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 w-full overflow-hidden bg-black text-zinc-100">
      <Sidebar
        menuItems={mainMenuItems}
        activeMenu={activeMenu}
        onSelectMenu={handleSidebarSelect}
        token={token}
        user={user}
        onLogout={token ? onLogout : undefined}
      />

      <div
        className={`relative flex min-h-0 flex-1 overflow-hidden ${
          feedCommentsOpen
            ? "flex-row items-stretch"
            : feedAlignStart
              ? "items-center justify-start pl-1 py-1"
              : "items-center justify-center px-4 py-1"
        }`}
      >
        <AccountActionsPill
          className="absolute right-8 top-5 z-[100]"
          tone="profile"
        >
          {!token ? (
            <Link
              to="/login"
              className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs font-semibold leading-none text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản" tipHidden={showAccountMenu} hoverOnly>
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <AvatarImage
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt="avatar người dùng"
                    fallbackSrc={DEFAULT_USER_AVATAR_URL}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div className="absolute right-0 z-[110] mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
                  <Link
                    to={buildProfilePath(token, user)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </AccountActionsPill>

        <div
          className={`flex min-h-0 flex-1 ${
            feedCommentsOpen
              ? feedDockLandscape
                ? "min-w-0 items-center justify-start px-1 py-0"
                : "min-w-0 items-center justify-center px-1 py-0"
              : feedAlignStart
                ? "items-center justify-start"
                : "items-center justify-center"
          }`}
        >
          {!feedHydrated && videos.length === 0 ? (
            <div
              className={`relative flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
              style={{ height: feedSlotHeightPx }}
              aria-busy="true"
              aria-label="Đang tải feed"
            >
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
                aria-hidden
              />
              <p className="mt-4 text-sm text-zinc-500">Đang tải…</p>
            </div>
          ) : videos.length === 0 ? (
            <div
              className={`relative flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
              style={{ height: feedSlotHeightPx }}
              aria-live="polite"
            >
              <IoVideocam
                className="mb-4 h-14 w-14 text-zinc-600"
                aria-hidden
              />
              {!token ? (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    Chưa có video trên feed
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
                    Đăng nhập để xem nội dung và đẩy lên video đầu tiên của bạn
                    trên Vibely.
                  </p>
                  <Link
                    to="/login"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Đăng nhập
                  </Link>
                </>
              ) : isFollowingFeed ? (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    Chưa có video từ người bạn follow
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                    Khi nhà sáng tạo bạn theo dõi đăng video, chúng sẽ hiện tại đây theo thứ tự ngẫu nhiên.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    For You chưa có video
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                    Đây là nơi bạn xem video được gợi ý từ cộng đồng Vibely. Khi
                    có bài đăng công khai, chúng sẽ hiện tại đây — bạn cũng có thể
                    tải video lên để chia sẻ với mọi người.
                  </p>
                  <Link
                    to="/vibelystudio/upload"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    <MdOutlineFileUpload className="text-lg" aria-hidden />
                    Tải lên video
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div
              className={`flex max-w-full flex-row ${
                feedCommentsOpen
                  ? feedDockLandscape
                    ? "h-full min-w-0 max-w-full items-center justify-start"
                    : "h-full min-w-0 max-w-full items-center justify-center"
                  : feedAlignStart
                    ? "items-center justify-start gap-0 pr-2 sm:pr-3"
                    : "items-center justify-center gap-0"
              }`}
            >
              <div
                className={
                  feedCommentsOpen
                    ? feedDockLandscape
                      ? "relative flex h-full min-h-0 flex-col items-start justify-center"
                      : "relative flex h-full min-h-0 flex-col items-center justify-center"
                    : "relative shrink-0"
                }
              >
                <FeedPhoneStage
                  videos={videos}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  feedSlotHeightPx={feedSlotHeightPx}
                  virtualFeedRef={virtualFeedRef}
                  loadMoreFeed={loadMoreFeed}
                  feedVideoRef={feedVideoRef}
                  feedVolume={feedVolume}
                  setFeedVolume={setFeedVolume}
                  feedSoundOn={feedSoundOn}
                  setFeedSoundOn={setFeedSoundOn}
                  playbackMuted={playbackMuted}
                  feedMoreMenuOpen={feedMoreMenuOpen}
                  setFeedMoreMenuOpen={setFeedMoreMenuOpen}
                  feedMoreMenuSubpage={feedMoreMenuSubpage}
                  setFeedMoreMenuSubpage={setFeedMoreMenuSubpage}
                  feedVideoQuality={feedVideoQuality}
                  setFeedVideoQuality={setFeedVideoQuality}
                  feedPlaybackSpeed={feedPlaybackSpeed}
                  setFeedPlaybackSpeed={setFeedPlaybackSpeed}
                  feedAutoScrollEnabled={feedAutoScrollEnabled}
                  setFeedAutoScrollEnabled={setFeedAutoScrollEnabled}
                  toggleFeedPlayback={toggleFeedPlayback}
                  userPaused={userPaused}
                  toggleFeedPictureInPicture={toggleFeedPictureInPicture}
                  resolveFeedAuthorDisplayName={resolveFeedAuthorDisplayName}
                  feedDefaultAuthorAvatar={FEED_DEFAULT_AUTHOR_AVATAR}
                  thumbnailFallbackUrl={undefined}
                  playbackFlash={playbackFlash}
                  onActiveFeedPlaybackTick={onActiveFeedPlaybackTick}
                  onActiveFeedPlaybackEnded={onActiveFeedPlaybackEnded}
                  commentsDockOpen={feedCommentsOpen}
                  onStageWideChange={setStageWide}
                  contextMenuToken={token}
                  onVideoContextShare={handleVideoContextShare}
                  onVideoContextCopyLink={handleVideoContextCopyLink}
                  onVideoContextViewDetails={handleVideoContextViewDetails}
                />
                <BookmarkSaveToast
                  open={bookmarkToastOpen}
                  onManage={openBookmarkManagePopover}
                  onDismiss={() => setBookmarkToastOpen(false)}
                />
              </div>
              <div
                className={`ml-2 flex shrink-0 flex-col items-center gap-3 sm:ml-3 ${
                  feedCommentsOpen
                    ? "justify-center self-center"
                    : "pb-12 sm:pb-14"
                }`}
              >
                <div className="relative mb-3 h-12 w-12">
                  <Link
                    to={activeAuthorProfilePath || "#"}
                    aria-label={`Xem hồ sơ ${activeVideo?.authorUsername ?? "user"}`}
                    className={`block h-12 w-12 rounded-full ${
                      activeAuthorProfilePath ? "cursor-pointer" : "pointer-events-none"
                    }`}
                  >
                    <AvatarImage
                      className="h-full w-full rounded-full object-cover"
                      src={activeVideo?.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                      alt={`avatar-${activeVideo?.authorUsername ?? "user"}`}
                      fallbackSrc={FEED_DEFAULT_AUTHOR_AVATAR}
                    />
                  </Link>
                  {showActiveAuthorFollowSuccess ? (
                    <span
                      aria-label={`Đã theo dõi ${activeVideo?.authorUsername ?? "user"}`}
                      className="absolute bottom-0 left-1/2 flex h-6 w-6 -translate-x-1/2 translate-y-[38%] items-center justify-center rounded-full border border-zinc-500 bg-zinc-200 text-sm text-red-500 shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
                    >
                      <IoCheckmark aria-hidden />
                    </span>
                  ) : null}
                  {showActiveAuthorFollowBadge && !showActiveAuthorFollowSuccess ? (
                    <button
                      type="button"
                      aria-label={`Theo dõi ${activeVideo?.authorUsername ?? "user"}`}
                      className="absolute bottom-0 left-1/2 flex h-6 w-6 -translate-x-1/2 translate-y-[38%] cursor-pointer items-center justify-center rounded-full border-2 border-black bg-red-500 text-base leading-none text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)] disabled:cursor-wait disabled:opacity-75"
                      onClick={handleActiveAuthorFollow}
                      disabled={followBusyAuthorId === Number(activeVideo?.authorId)}
                    >
                      <span className="-translate-y-px">+</span>
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={liked}
                  aria-label={liked ? "Bỏ thích" : "Thích"}
                  onClick={() => {
                    if (!token || !isVideoPublicId(activeVideo?.publicId)) {
                      setLiked((prev) => !prev);
                      return;
                    }
                    const next = !liked;
                    const prevCount = Number(activeVideo.likeCount ?? 0);
                    setLiked(next);
                    patchVideoByPublicId(activeVideo.publicId, {
                      likeCount: Math.max(0, prevCount + (next ? 1 : -1)),
                    });
                    const req = next
                      ? apiClient.likeVideo(activeVideo.publicId, token)
                      : apiClient.unlikeVideo(activeVideo.publicId, token);
                    req.catch(() => {
                      setLiked(!next);
                      patchVideoByPublicId(activeVideo.publicId, { likeCount: prevCount });
                    });
                  }}
                >
                  <IoHeart
                    className={liked ? "text-red-500" : "text-zinc-100"}
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.likeCount)}
                </span>
                <button
                  type="button"
                  className={`${FEED_ROUND_ICON_BUTTON} ${feedCommentsOpen ? "ring-2 ring-white/35 ring-offset-2 ring-offset-black" : ""}`}
                  aria-label="Bình luận"
                  aria-expanded={feedCommentsOpen}
                  onClick={() => setFeedCommentsOpen((open) => !open)}
                >
                  <FaComment className="text-lg text-zinc-100" aria-hidden />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.commentCount)}
                </span>
                <button
                  ref={bookmarkButtonRef}
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}
                  onClick={handleBookmarkToggle}
                >
                  <IoBookmark
                    className={
                      bookmarked
                        ? "text-xl text-[#FACE15]"
                        : "text-xl text-white"
                    }
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.bookmarkCount)}
                </span>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-label="Chia sẻ"
                  aria-expanded={shareModalOpen}
                  onClick={() => {
                    if (!isVideoPublicId(activeVideo?.publicId)) return;
                    setShareModalOpen(true);
                  }}
                >
                  <IoArrowRedo aria-hidden />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.shareCount)}
                </span>
                <button
                  type="button"
                  aria-label="Âm thanh đang phát"
                  className="relative mt-1 flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/35 bg-zinc-950 shadow-lg"
                  onClick={() => {
                    const rawAudioUrl = String(activeVideo?.audioUrl ?? "").trim();
                    if (!rawAudioUrl) return;
                    const q = new URLSearchParams({
                      audioUrl: rawAudioUrl,
                      title: String(activeVideo?.audioTitle ?? "").trim(),
                      creator: resolveFeedAuthorDisplayName(activeVideo),
                    });
                    const av = String(activeVideo?.avatarUrl ?? "").trim();
                    if (av) q.set("creatorAvatar", av);
                    const un = String(activeVideo?.authorUsername ?? "")
                      .trim()
                      .replace(/^@/, "");
                    if (un) q.set("creatorUsername", un);
                    const sid = activeVideo?.publicId;
                    if (isVideoPublicId(sid)) {
                      q.set("sourceVideoId", String(sid).toLowerCase());
                    }
                    navigate(`/sound?${q.toString()}`);
                  }}
                >
                  <AvatarImage
                    src={activeVideo?.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                    alt=""
                    fallbackSrc={FEED_DEFAULT_AUTHOR_AVATAR}
                    className="h-full w-full scale-110 object-cover animate-[spin_12s_linear_infinite]"
                  />
                </button>
              </div>
              <FeedChevronNav
                activeIndex={activeIndex}
                videoCount={videos.length}
                onStep={requestFeedStep}
                busy={feedStepBusy}
              />
            </div>
          )}
        </div>

        <FeedCommentsPanel
          open={feedCommentsOpen && videos.length > 0}
          activeVideo={activeVideo}
          comments={feedComments}
          setComments={setFeedComments}
          loading={feedCommentsLoading}
          error={feedCommentsError}
          token={token}
          user={user}
          commentDraft={commentDraft}
          setCommentDraft={setCommentDraft}
          commentPostError={commentPostError}
          setCommentPostError={setCommentPostError}
          onClose={() => setFeedCommentsOpen(false)}
          onCommentCountChange={() => {
            const prevCc = Number(activeVideo?.commentCount ?? 0);
            if (activeVideo?.publicId) {
              patchVideoByPublicId(activeVideo.publicId, {
                commentCount: prevCc + 1,
              });
            }
          }}
          formatCompactCount={formatCompactCount}
          formatRelativeTimeVi={formatRelativeTimeVi}
        />
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold leading-snug">
              Bạn có chắc chắn muốn đăng xuất?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BookmarkCollectionPopover
        open={bookmarkManageOpen}
        anchorRef={bookmarkButtonRef}
        onCreateCollection={openNewCollectionModal}
        onClose={() => setBookmarkManageOpen(false)}
      />

      <NewCollectionModal
        open={newCollectionOpen}
        onClose={() => setNewCollectionOpen(false)}
        token={token}
        initialPickVideoId={activeVideo?.publicId ?? null}
      />

      <VideoShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        videoId={activeVideo?.publicId}
        authorUsername={activeVideo?.authorUsername}
        videoTitle={activeVideo?.title ?? ""}
        token={token}
        onShareCountChange={(shareCount) => {
          const vid = activeVideo?.publicId;
          if (!vid) return;
          if (shareCount != null) {
            patchVideoByPublicId(vid, { shareCount });
            return;
          }
          patchVideoByPublicId(vid, {
            shareCount: Number(activeVideo?.shareCount ?? 0) + 1,
          });
        }}
      />
    </section>
  );
}
