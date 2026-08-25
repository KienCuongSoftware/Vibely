import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { profileApi } from "@/features/profile/api/profileApi";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioHoverTip } from "@/features/studio/components/StudioHoverTip";
import { StudioTrendChart, formatStudioMoney } from "@/features/studio/components/StudioTrendChart";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { previousPeriodTotal } from "@/features/studio/utils/studioMetricDelta.js";
import { StudioMetricDeltaLine } from "@/features/studio/components/StudioMetricDeltaLine.jsx";
import { AvatarImage } from "@/shared/components/AvatarImage.jsx";
import {
  DEFAULT_AVATAR_URL,
  sanitizeAvatarUrl,
} from "@/features/profile/utils/avatarUrl.js";

const PERIOD_OPTIONS = [
  { days: 7, labelKey: "studio.period.d7" },
  { days: 28, labelKey: "studio.period.d28" },
  { days: 60, labelKey: "studio.period.d60" },
  { days: 90, labelKey: "studio.period.d90" },
];

const KNOWLEDGE_ITEMS = [
  { id: "hooks", titleKey: "studio.home.knowledge.hooksTitle", descKey: "studio.home.knowledge.hooksDesc" },
  { id: "consistency", titleKey: "studio.home.knowledge.consistencyTitle", descKey: "studio.home.knowledge.consistencyDesc" },
  { id: "caption", titleKey: "studio.home.knowledge.captionTitle", descKey: "studio.home.knowledge.captionDesc" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildZeroPoints(days) {
  const now = new Date();
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    rows.push({
      day: d.toISOString().slice(0, 10),
      views: 0,
      likes: 0,
      comments: 0,
      profileViews: 0,
    });
  }
  return rows;
}

function formatCompact(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(v));
}

function pointValue(p, metric) {
  if (metric === "likes") return Number(p.likes ?? 0);
  if (metric === "comments") return Number(p.comments ?? 0);
  if (metric === "profileViews") return Number(p.profileViews ?? 0);
  return Number(p.views ?? 0);
}

export function StudioHomePage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [metric, setMetric] = useState("views");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [overview, setOverview] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalProfileViews: 0,
    points: buildZeroPoints(7),
    latestComments: [],
  });
  const [priorTotals, setPriorTotals] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalProfileViews: 0,
  });

  const avatarSrc = sanitizeAvatarUrl(
    user?.avatarUrl || profile?.avatarUrl,
    DEFAULT_AVATAR_URL,
    user?.id || profile?.id,
  );
  const displayName =
    user?.username || profile?.username || user?.displayName || t("studio.home.you");

  useEffect(() => {
    document.title = t("studio.docTitle.home");
  }, [t]);

  useEffect(() => {
    if (!token || !user?.username) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await profileApi.getPublicProfile(user.username, token);
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setProfile(null);
      }
      try {
        const page = await profileApi.getMyUploadedVideos(token, {
          page: 0,
          size: 6,
        });
        const items = Array.isArray(page?.content)
          ? page.content
          : Array.isArray(page?.items)
            ? page.items
            : Array.isArray(page)
              ? page
              : [];
        if (!cancelled) {
          setRecentPosts(
            items.filter((video) => !Boolean(video?.studioDraft)).slice(0, 6),
          );
        }
      } catch {
        if (!cancelled) setRecentPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.username]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const data = await apiClient.getStudioAnalyticsOverview(token, {
            days,
          });
          let doubled = null;
          try {
            doubled = await apiClient.getStudioAnalyticsOverview(token, {
              days: days * 2,
            });
          } catch {
            doubled = null;
          }
          if (cancelled) return;
          const nextOverview = {
            totalViews: Number(data?.totalViews ?? 0),
            totalLikes: Number(data?.totalLikes ?? 0),
            totalComments: Number(data?.totalComments ?? 0),
            totalProfileViews: Number(data?.totalProfileViews ?? 0),
            points:
              Array.isArray(data?.points) && data.points.length
                ? data.points
                : buildZeroPoints(days),
            latestComments: Array.isArray(data?.latestComments)
              ? data.latestComments
              : [],
          };
          setOverview(nextOverview);
          setPriorTotals({
            totalViews: previousPeriodTotal(doubled?.totalViews, nextOverview.totalViews),
            totalLikes: previousPeriodTotal(doubled?.totalLikes, nextOverview.totalLikes),
            totalComments: previousPeriodTotal(
              doubled?.totalComments,
              nextOverview.totalComments,
            ),
            totalProfileViews: previousPeriodTotal(
              doubled?.totalProfileViews,
              nextOverview.totalProfileViews,
            ),
          });
          if (!cancelled) setLoading(false);
          return;
        } catch {
          if (attempt < maxAttempts) {
            await sleep(500);
            continue;
          }
          if (!cancelled) {
            setOverview({
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              totalProfileViews: 0,
              points: buildZeroPoints(days),
              latestComments: [],
            });
            setPriorTotals({
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              totalProfileViews: 0,
            });
          }
        } finally {
          if (!cancelled && attempt === maxAttempts) setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  const metricTabs = useMemo(
    () => [
      {
        id: "views",
        label: t("studio.metrics.videoViews"),
        value: overview.totalViews,
        previous: priorTotals.totalViews,
        tip: t("studio.metrics.videoViewsTip"),
      },
      {
        id: "profileViews",
        label: t("studio.metrics.profileViews"),
        value: overview.totalProfileViews,
        previous: priorTotals.totalProfileViews,
        tip: t("studio.metrics.profileViewsTip"),
      },
      {
        id: "likes",
        label: t("studio.metrics.likes"),
        value: overview.totalLikes,
        previous: priorTotals.totalLikes,
        tip: t("studio.metrics.likesTip"),
      },
      {
        id: "comments",
        label: t("studio.metrics.comments"),
        value: overview.totalComments,
        previous: priorTotals.totalComments,
        tip: t("studio.metrics.commentsTip"),
      },
      {
        id: "shares",
        label: t("studio.metrics.shares"),
        value: 0,
        previous: 0,
        tip: t("studio.metrics.sharesTip"),
      },
      {
        id: "rewards",
        label: t("studio.metrics.rewards"),
        value: "$0.00",
        raw: true,
        money: true,
        previous: 0,
        tip: t("studio.metrics.rewardsTip"),
      },
    ],
    [overview, priorTotals, t],
  );

  const chartPoints = useMemo(() => {
    const rows = overview.points ?? [];
    if (metric === "rewards" || metric === "shares") {
      return rows.map((p) => ({ day: p.day, value: 0 }));
    }
    const chartMetric =
      metric === "likes" || metric === "comments" || metric === "profileViews"
        ? metric
        : "views";
    return rows.map((p) => ({
      day: p.day,
      value: pointValue(p, chartMetric),
    }));
  }, [overview.points, metric]);

  const periodOpt = PERIOD_OPTIONS.find((o) => o.days === days);
  const periodLabel = periodOpt ? t(periodOpt.labelKey) : String(days);

  const likesTotal = Number(
    profile?.totalLikeCount ?? overview.totalLikes ?? 0,
  );
  const followers = Number(profile?.followerCount ?? 0);
  const following = Number(profile?.followingCount ?? 0);

  return (
    <StudioLayout active="home" hidePageHeader hideTopBrand>
      {/* TikTok Home: avatar + username + Likes · Followers · Following */}
      <section className="mb-5 flex items-center gap-4">
        <AvatarImage
          src={avatarSrc}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-zinc-700 object-cover sm:h-[72px] sm:w-[72px]"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-zinc-100 sm:text-xl">
            {displayName}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Likes{" "}
            <span className="font-semibold text-zinc-200">
              {formatCompact(likesTotal)}
            </span>
            <span className="mx-1.5 text-zinc-600">·</span>
            Followers{" "}
            <span className="font-semibold text-zinc-200">
              {formatCompact(followers)}
            </span>
            <span className="mx-1.5 text-zinc-600">·</span>
            Following{" "}
            <span className="font-semibold text-zinc-200">
              {formatCompact(following)}
            </span>
          </p>
        </div>
      </section>

      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-0.5 text-base font-bold text-zinc-100 hover:text-white"
            onClick={() => navigate("/vibelystudio/analytics")}
          >
            {t("studio.home.keyMetrics")}
            <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
          </button>
          <div className="relative">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              onClick={() => setPeriodOpen((o) => !o)}
              aria-expanded={periodOpen}
            >
              {periodLabel} ▾
            </button>
            {periodOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                      days === opt.days
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                    onClick={() => {
                      setDays(opt.days);
                      setPeriodOpen(false);
                    }}
                  >
                    {t(opt.labelKey)}
                    {days === opt.days ? " ✓" : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 overflow-visible border-b border-zinc-800/80 sm:grid-cols-3 lg:grid-cols-6">
          {metricTabs.map((tab) => {
            const active = metric === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`relative cursor-pointer overflow-visible px-3 py-3 text-left transition hover:bg-zinc-900/60 ${
                  active ? "bg-zinc-900/40" : ""
                }`}
                onClick={() => setMetric(tab.id)}
              >
                {active ? (
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-sky-400" />
                ) : null}
                <p className="text-[11px] text-zinc-500 sm:text-xs">
                  <StudioHoverTip text={tab.tip}>{tab.label}</StudioHoverTip>
                </p>
                <p
                  className={`mt-1 text-xl font-bold sm:text-2xl ${
                    active ? "text-sky-300" : "text-zinc-100"
                  }`}
                >
                  {tab.raw ? tab.value : formatCompact(tab.value)}
                </p>
                <StudioMetricDeltaLine
                  current={tab.money ? 0 : tab.value}
                  previous={tab.previous}
                  money={Boolean(tab.money)}
                />
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <p className="mb-2 text-sm text-zinc-500">Đang tải thống kê…</p>
          ) : null}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 pt-10">
            <StudioTrendChart
              points={chartPoints}
              formatValue={
                metric === "rewards" ? formatStudioMoney : formatCompact
              }
              scale={metric === "rewards" ? "money" : "count"}
              yMax={metric === "rewards" ? 1.2 : undefined}
              emptyHint={
                metric === "rewards" ? null : t("studio.home.zeroInPeriod")
              }
            />
          </div>
        </div>
      </section>

      {/* Lưới dưới: bài đăng / kiến thức + bình luận */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <div className="space-y-5">
          <section>
            <button
              type="button"
              className="mb-3 inline-flex cursor-pointer items-center gap-0.5 text-base font-bold text-zinc-100 hover:text-white"
              onClick={() => navigate("/vibelystudio/posts")}
            >
              {t("studio.home.recentPosts")}
              <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
            </button>
            <div className="min-h-[140px] rounded-xl border border-zinc-800 bg-zinc-950/50">
              {recentPosts.length === 0 ? (
                <p className="flex h-[140px] items-center justify-center text-sm text-zinc-500">
                  Chưa có bài đăng nào
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {recentPosts.map((v) => {
                    const title =
                      (v.description && String(v.description).trim()) ||
                      v.title ||
                      "Video";
                    return (
                      <li key={v.publicId}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-900/60"
                          onClick={() =>
                            navigate(`/vibelystudio/analytics/${v.publicId}`)
                          }
                        >
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
                            {v.thumbnailUrl ? (
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {title}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {formatCompact(v.viewCount ?? 0)} lượt xem
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section>
            <button
              type="button"
              className="mb-3 inline-flex cursor-pointer items-center gap-0.5 text-base font-bold text-zinc-100 hover:text-white"
              onClick={() => navigate("/vibelystudio/posts")}
            >
              Bình luận mới nhất
              <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
            </button>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              {overview.latestComments.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Chưa có bình luận nào trên video của bạn
                </p>
              ) : (
                <div className="space-y-2">
                  {overview.latestComments.slice(0, 5).map((comment) => (
                    <article
                      key={comment.commentId}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
                    >
                      <p className="text-xs text-zinc-500">
                        @{comment.commenterUsername} •{" "}
                        {new Date(comment.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="mt-1 text-sm text-zinc-200">
                        {comment.content}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Video: {comment.videoTitle}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section>
          <h2 className="mb-3 inline-flex items-center gap-0.5 text-base font-bold text-zinc-100">
            {t("studio.home.knowledgeForYou")}
            <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
          </h2>
          <div className="space-y-3">
            {KNOWLEDGE_ITEMS.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {t(item.titleKey)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {t(item.descKey)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudioLayout>
  );
}
