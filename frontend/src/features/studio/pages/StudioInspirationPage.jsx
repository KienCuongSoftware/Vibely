import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IoBookmark,
  IoBookmarkOutline,
  IoChevronDown,
  IoChevronForward,
  IoHeartOutline,
  IoPlayOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioAccountMenu } from "@/features/studio/components/StudioAccountMenu";
import { VideoThumbnailImg } from "@/features/post/components/VideoThumbnailImg.jsx";
import { GridHoverVideoMedia } from "@/features/post/components/GridHoverVideoMedia.jsx";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { buildProfileWatchUrl } from "@/features/post/utils/videoPublicId.js";
import { getRegionLabel } from "@/features/settings/utils/accountRegions";

const PAGE_SIZE = 20;
const TABS = [
  { id: "trending", label: "Thịnh hành" },
  { id: "recommended", label: "Đề xuất" },
  { id: "saved", label: "Cảm hứng của tôi" },
];
const TRENDING_KINDS = [
  { id: "posts", label: "Bài đăng" },
  { id: "creators", label: "Nhà sáng tạo" },
];
const RECOMMENDED_KINDS = [
  { id: "similar_posts", label: "Bài đăng tương tự" },
  { id: "followers_viewed", label: "Người theo dõi đã xem" },
  { id: "similar_creators", label: "Nhà sáng tạo tương tự" },
];
const REGION_CODES = [
  "VN",
  "US",
  "KR",
  "JP",
  "TH",
  "ID",
  "GB",
  "AU",
  "DE",
  "FR",
  "CA",
  "SG",
  "MY",
  "PH",
  "TW",
  "CN",
  "IN",
  "BR",
];

function formatCompact(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
}

function captionOf(item) {
  const desc = String(item?.description ?? "").trim();
  if (desc) return desc;
  return String(item?.title ?? "").trim() || "Video";
}

function EmptyState({ title, subtitle, action }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      {subtitle ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{subtitle}</p>
      ) : null}
      {action}
    </div>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition lg:text-sm ${
        active
          ? "border-white bg-white font-bold text-black"
          : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RankBadge({ rank }) {
  return (
    <span className="pointer-events-none absolute left-1.5 top-0 z-10 flex h-6 min-w-5 items-center justify-center rounded-b bg-black/75 px-1 text-[11px] font-bold text-white shadow-sm">
      {rank}
    </span>
  );
}

function VideoCard({ item, onToggleSave, busy }) {
  const watchUrl = buildProfileWatchUrl(item.authorUsername, item.publicId) || "/foryou";
  return (
    <article className="group min-w-0">
      <Link
        to={watchUrl}
        className="relative block aspect-9/16 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600"
      >
        <VideoThumbnailImg src={item.thumbnailUrl} alt="" />
        <RankBadge rank={item.rank} />
        <button
          type="button"
          aria-label={item.saved ? "Bỏ khỏi Cảm hứng của tôi" : "Thêm vào Cảm hứng của tôi"}
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(item);
          }}
          className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100"
        >
          {item.saved ? (
            <IoBookmark className="text-base text-[#20d5ec]" aria-hidden />
          ) : (
            <IoBookmarkOutline className="text-base" aria-hidden />
          )}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/25 to-transparent px-2 pb-1.5 pt-10">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white drop-shadow-md">
            <span className="inline-flex items-center gap-0.5">
              <IoPlayOutline className="text-[13px]" aria-hidden />
              {formatCompact(item.viewCount)}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <IoHeartOutline className="text-[13px]" aria-hidden />
              {formatCompact(item.likeCount)}
            </span>
          </div>
        </div>
      </Link>
      <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-zinc-200">
        {captionOf(item)}
      </p>
    </article>
  );
}

function CreatorCard({ creator, token, playing, onHover }) {
  const [followed, setFollowed] = useState(Boolean(creator?.followedByViewer));
  const [busy, setBusy] = useState(false);
  const username = String(creator?.username ?? "").trim();
  const profilePath = username ? `/@${encodeURIComponent(username)}` : "/foryou";
  const displayName =
    String(creator?.displayName ?? "").trim() || username || "Nhà sáng tạo";

  useEffect(() => {
    setFollowed(Boolean(creator?.followedByViewer));
  }, [creator?.followedByViewer, creator?.id]);

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || busy || !creator?.id) return;
    setBusy(true);
    try {
      if (followed) {
        await apiClient.unfollow(creator.id, token);
        setFollowed(false);
      } else {
        await apiClient.follow(creator.id, token);
        setFollowed(true);
      }
    } catch {
      /* keep prior follow state */
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="min-w-0"
      onMouseEnter={() => onHover?.(creator?.id)}
    >
      <div className="relative aspect-9/16 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800">
        <GridHoverVideoMedia
          videoUrl={creator.previewVideoUrl}
          thumbnailUrl={creator.previewThumbnailUrl}
          playing={playing}
        />
        <RankBadge rank={creator.rank} />
        <Link to={profilePath} className="absolute inset-0 z-[1]" aria-label={displayName} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-linear-to-t from-black/90 via-black/40 to-transparent px-2 pb-2.5 pt-12 text-center">
          <img
            src={creator.avatarUrl || "/images/users/default-avatar.jpeg"}
            alt=""
            className="mx-auto h-10 w-10 rounded-full object-cover ring-2 ring-white/80"
            referrerPolicy="no-referrer"
          />
          <p className="mt-1.5 truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="truncate text-[11px] text-zinc-400">
            {formatCompact(creator.followerCount)} người theo dõi
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleFollow}
            className={`pointer-events-auto mt-2 w-full cursor-pointer rounded-md py-1.5 text-xs font-semibold ${
              followed
                ? "bg-zinc-800 text-zinc-200 ring-1 ring-zinc-600"
                : "bg-[#fe2c55] text-white hover:bg-[#e62a4d]"
            }`}
          >
            {followed ? "Đã follow" : "Follow"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function StudioInspirationPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "trending";
  const trendingKind = TRENDING_KINDS.some((k) => k.id === searchParams.get("kind"))
    ? searchParams.get("kind")
    : "posts";
  const recKind = RECOMMENDED_KINDS.some((k) => k.id === searchParams.get("rec"))
    ? searchParams.get("rec")
    : "similar_posts";
  const category = searchParams.get("category") || "all";
  const region = searchParams.get("region") || "all";

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [creators, setCreators] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [minFollowers, setMinFollowers] = useState(1000);
  const [busyId, setBusyId] = useState("");
  const [hoverCreatorId, setHoverCreatorId] = useState(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const regionRef = useRef(null);
  const catScrollRef = useRef(null);

  const patchParams = useCallback(
    (next) => {
      const merged = {
        tab,
        kind: trendingKind,
        rec: recKind,
        category,
        region,
        ...next,
      };
      const params = {};
      if (merged.tab && merged.tab !== "trending") params.tab = merged.tab;
      if (merged.tab === "trending" && merged.kind && merged.kind !== "posts") {
        params.kind = merged.kind;
      }
      if (merged.tab === "recommended" && merged.rec && merged.rec !== "similar_posts") {
        params.rec = merged.rec;
      }
      if (merged.tab === "trending" && merged.category && merged.category !== "all") {
        params.category = merged.category;
      }
      if (merged.tab === "trending" && merged.region && merged.region !== "all") {
        params.region = merged.region;
      }
      setSearchParams(params, { replace: true });
    },
    [tab, trendingKind, recKind, category, region, setSearchParams],
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    apiClient
      .getStudioInspirationCategories(token)
      .then((rows) => {
        if (cancelled) return;
        const next = (Array.isArray(rows) ? rows : []).filter(
          (c) => Number(c?.videoCount ?? 0) > 0,
        );
        setCategories(next);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (category === "all" || categories.length === 0) return;
    if (!categories.some((c) => c.slug === category)) {
      patchParams({ category: "all" });
    }
  }, [categories, category, patchParams]);

  const fetchPage = useCallback(
    async (nextPage) => {
      if (tab === "saved") {
        return apiClient.getStudioInspirationSaved(token, {
          page: nextPage,
          size: PAGE_SIZE,
        });
      }
      if (tab === "recommended") {
        return apiClient.getStudioInspirationRecommended(token, {
          kind: recKind,
          page: nextPage,
          size: PAGE_SIZE,
        });
      }
      return apiClient.getStudioInspirationTrending(token, {
        kind: trendingKind,
        category,
        region,
        page: nextPage,
        size: PAGE_SIZE,
      });
    },
    [token, tab, trendingKind, recKind, category, region],
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setLocked(false);
    (async () => {
      try {
        const data = await fetchPage(0);
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setCreators(Array.isArray(data?.creators) ? data.creators : []);
        setPage(0);
        setHasNext(Boolean(data?.hasNext));
        setLocked(Boolean(data?.locked));
        setMinFollowers(Number(data?.minFollowers ?? 1000));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không tải được cảm hứng.");
        setItems([]);
        setCreators([]);
        setHasNext(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, fetchPage]);

  useEffect(() => {
    if (!regionOpen) return undefined;
    const onDoc = (e) => {
      if (!regionRef.current?.contains(e.target)) setRegionOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [regionOpen]);

  const loadMore = async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1);
      setItems((prev) => prev.concat(Array.isArray(data?.items) ? data.items : []));
      setCreators((prev) =>
        prev.concat(Array.isArray(data?.creators) ? data.creators : []),
      );
      setPage((p) => p + 1);
      setHasNext(Boolean(data?.hasNext));
    } catch {
      /* keep current page */
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSave = async (item) => {
    const publicId = item?.publicId;
    if (!publicId || busyId) return;
    setBusyId(publicId);
    const nextSaved = !item.saved;
    const patch = (list) =>
      list.map((row) =>
        row.publicId === publicId ? { ...row, saved: nextSaved } : row,
      );
    setItems(patch);
    try {
      if (nextSaved) {
        await apiClient.saveStudioInspiration(token, publicId);
      } else {
        await apiClient.unsaveStudioInspiration(token, publicId);
        if (tab === "saved") {
          setItems((prev) => prev.filter((row) => row.publicId !== publicId));
        }
      }
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.publicId === publicId ? { ...row, saved: item.saved } : row,
        ),
      );
    } finally {
      setBusyId("");
    }
  };

  const regionLabel =
    region === "all" ? "Tất cả khu vực" : getRegionLabel(region, "vi") || region;

  const showingCreators =
    (tab === "trending" && trendingKind === "creators") ||
    (tab === "recommended" && recKind === "similar_creators");

  const emptyTitle = useMemo(() => {
    if (tab === "saved") return "Chưa có bài viết nào được thêm";
    if (tab === "recommended" && locked) return "Chưa có đề xuất nào";
    if (tab === "recommended") return "Chưa có đề xuất nào";
    return showingCreators
      ? "Chưa có nhà sáng tạo thịnh hành"
      : "Chưa có bài đăng thịnh hành";
  }, [tab, locked, showingCreators]);

  const emptySubtitle = useMemo(() => {
    if (tab === "saved") {
      return "Bài đăng bạn thêm vào Cảm hứng của tôi sẽ xuất hiện tại đây.";
    }
    if (tab === "recommended" && locked) {
      return `Tab này chỉ dành cho những nhà sáng tạo có ít nhất ${formatCompact(minFollowers)} người theo dõi.`;
    }
    if (tab === "recommended") {
      return "Đăng video và tương tác thêm để Vibely gợi ý nội dung phù hợp với kênh của bạn.";
    }
    return "Hãy quay lại sau khi có thêm video công khai trên Vibely.";
  }, [tab, locked, minFollowers]);

  const scrollCats = (dir) => {
    const el = catScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <StudioLayout active="inspiration" hidePageHeader hideTopBar>
      <div className="mb-4 flex items-center justify-between gap-3">
        <nav className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto border-b border-zinc-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => patchParams({ tab: t.id })}
              className={`shrink-0 cursor-pointer px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
                tab === t.id
                  ? "border-b-2 border-zinc-100 text-zinc-100"
                  : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <StudioAccountMenu />
      </div>

      {tab === "trending" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TRENDING_KINDS.map((k) => (
            <Pill
              key={k.id}
              active={trendingKind === k.id}
              onClick={() => patchParams({ kind: k.id })}
            >
              {k.label}
            </Pill>
          ))}
          <div className="relative ml-auto" ref={regionRef}>
            <button
              type="button"
              onClick={() => setRegionOpen((o) => !o)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              {regionLabel}
              <IoChevronDown className="text-zinc-500" aria-hidden />
            </button>
            {regionOpen ? (
              <div className="absolute right-0 z-30 mt-1 max-h-72 min-w-[200px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                <button
                  type="button"
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                    region === "all"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                  onClick={() => {
                    patchParams({ region: "all" });
                    setRegionOpen(false);
                  }}
                >
                  Tất cả khu vực
                </button>
                {REGION_CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                      region === code
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                    onClick={() => {
                      patchParams({ region: code });
                      setRegionOpen(false);
                    }}
                  >
                    {getRegionLabel(code, "vi")}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "trending" && trendingKind === "posts" ? (
        <div className="mb-5 flex items-start gap-2">
          <div
            ref={catScrollRef}
            className="scrollbar-none min-w-0 flex-1 overflow-x-auto"
          >
            <div className="flex w-max gap-2 py-1">
              <Pill
                active={category === "all"}
                onClick={() => patchParams({ category: "all" })}
              >
                Tất cả
              </Pill>
              {categories.map((c) => (
                <Pill
                  key={c.slug}
                  active={category === c.slug}
                  onClick={() => patchParams({ category: c.slug })}
                >
                  {c.name}
                </Pill>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="Cuộn danh mục"
            onClick={() => scrollCats(1)}
            className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <IoChevronForward aria-hidden />
          </button>
        </div>
      ) : null}

      {tab === "recommended" ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {RECOMMENDED_KINDS.map((k) => (
            <Pill
              key={k.id}
              active={recKind === k.id}
              onClick={() => patchParams({ rec: k.id })}
            >
              {k.label}
            </Pill>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-500">Đang tải cảm hứng…</p>
      ) : showingCreators ? (
        creators.length === 0 ? (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {creators.map((c) => (
              <li key={c.id}>
                <CreatorCard
                  creator={c}
                  token={token}
                  playing={hoverCreatorId === c.id}
                  onHover={setHoverCreatorId}
                />
              </li>
            ))}
          </ul>
        )
      ) : items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          subtitle={emptySubtitle}
          action={
            tab === "saved" ? (
              <button
                type="button"
                onClick={() => patchParams({ tab: "trending" })}
                className="mt-4 cursor-pointer rounded-md bg-[#fe2c55] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e62a4d]"
              >
                Khám phá thịnh hành
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.publicId}>
              <VideoCard
                item={item}
                busy={busyId === item.publicId}
                onToggleSave={toggleSave}
              />
            </li>
          ))}
        </ul>
      )}

      {hasNext && !loading ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
          >
            {loadingMore ? "Đang tải…" : "Tải thêm"}
          </button>
        </div>
      ) : null}
    </StudioLayout>
  );
}
