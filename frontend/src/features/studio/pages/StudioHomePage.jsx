import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { profileApi } from "@/features/profile/api/profileApi";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioHoverTip } from "@/features/studio/components/StudioHoverTip";
import { StudioTrendChart, formatStudioMoney } from "@/features/studio/components/StudioTrendChart";
import { useAuth } from "@/features/auth/hooks/useAuth";

const PERIOD_OPTIONS = [
  { days: 7, label: "7 ngày qua" },
  { days: 28, label: "28 ngày qua" },
  { days: 60, label: "60 ngày qua" },
  { days: 90, label: "90 ngày qua" },
];

const KNOWLEDGE_ITEMS = [
  {
    id: "hooks",
    title: "Mở đầu video trong 3 giây",
    desc: "Giữ người xem bằng hook rõ ràng ngay khung hình đầu.",
  },
  {
    id: "consistency",
    title: "Đăng đều để tăng đề xuất",
    desc: "Lịch đăng ổn định giúp thuật toán hiểu kênh của bạn hơn.",
  },
  {
    id: "caption",
    title: "Mô tả và hashtag gọn",
    desc: "Viết ngắn, có từ khóa chính; tránh spam tag không liên quan.",
  },
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
  const { token } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [metric, setMetric] = useState("views");
  const [loading, setLoading] = useState(false);
  const [recentPosts, setRecentPosts] = useState([]);
  const [overview, setOverview] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalProfileViews: 0,
    points: buildZeroPoints(7),
    latestComments: [],
  });

  useEffect(() => {
    document.title = "VibelyStudio | Home";
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await profileApi.getMyUploadedVideos(token, {
          page: 0,
          size: 6,
        });
        const items = Array.isArray(page?.content)
          ? page.content
          : Array.isArray(page)
            ? page
            : [];
        if (!cancelled) setRecentPosts(items.slice(0, 6));
      } catch {
        if (!cancelled) setRecentPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
          if (cancelled) return;
          setOverview({
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
        label: "Lượt xem video",
        value: overview.totalViews,
        tip: "Số lần người xem đã xem video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "profileViews",
        label: "Lượt xem hồ sơ",
        value: overview.totalProfileViews,
        tip: "Số lần hồ sơ của bạn được xem trong khoảng thời gian đã chọn.",
      },
      {
        id: "likes",
        label: "Lượt thích",
        value: overview.totalLikes,
        tip: "Số lượt thích video của bạn nhận được trong khoảng thời gian đã chọn.",
      },
      {
        id: "comments",
        label: "Bình luận",
        value: overview.totalComments,
        tip: "Số bình luận trên video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "shares",
        label: "Chia sẻ",
        value: 0,
        tip: "Số lần video của bạn được chia sẻ trong khoảng thời gian đã chọn.",
      },
      {
        id: "rewards",
        label: "Ước tính thưởng",
        value: "$0.00",
        raw: true,
        tip: "Do khác biệt tỷ giá và múi giờ, một số số liệu có thể hơi khác các báo cáo khác.",
      },
    ],
    [overview],
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

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.days === days)?.label ?? `${days} ngày qua`;

  return (
    <StudioLayout active="home" hidePageHeader hideTopBrand>
      {/* Chỉ số chính — không có khối avatar/follower (khớp TikTok Analytics Overview) */}
      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
          <h2 className="inline-flex items-center gap-0.5 text-base font-bold text-zinc-100">
            Chỉ số chính
            <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
          </h2>
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
                    {opt.label}
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
                <p className="mt-0.5 text-[11px] text-zinc-600">0 (--)</p>
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
                metric === "rewards" ? null : "0 trong khoảng thời gian này"
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
              Bài đăng gần đây
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
            Kiến thức dành cho bạn
            <IoChevronForward className="text-lg text-zinc-500" aria-hidden />
          </h2>
          <div className="space-y-3">
            {KNOWLEDGE_ITEMS.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudioLayout>
  );
}
