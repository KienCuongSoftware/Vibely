import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoInformationCircleOutline,
  IoVideocamOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioHoverTip } from "@/features/studio/components/StudioHoverTip";
import {
  StudioTrendChart,
  formatStudioMoney,
} from "@/features/studio/components/StudioTrendChart";
import { useAuth } from "@/features/auth/hooks/useAuth";

const PERIOD_OPTIONS = [
  { days: 7, label: "7 ngày qua" },
  { days: 28, label: "28 ngày qua" },
  { days: 60, label: "60 ngày qua" },
  { days: 90, label: "90 ngày qua" },
];

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "content", label: "Nội dung" },
  { id: "viewers", label: "Người xem" },
  { id: "followers", label: "Người theo dõi" },
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
      profileViews: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      newFollowers: 0,
    });
  }
  return rows;
}

const EMPTY_PAYLOAD = (days) => ({
  days,
  totalViews: 0,
  totalProfileViews: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalFollowers: 0,
  newFollowers: 0,
  publishedVideoCount: 0,
  periodPublishedVideoCount: 0,
  points: buildZeroPoints(days),
  topVideos: [],
  trafficSources: [],
  searchKeywords: [],
  followerRegions: [],
  followerAgeBuckets: [],
});

function formatCompact(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(v));
}

function formatDay(day) {
  const s = String(day ?? "").slice(0, 10);
  if (!s) return "—";
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (!total) return "";
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function sumBy(points, key) {
  return (points ?? []).reduce((acc, p) => acc + Number(p?.[key] ?? 0), 0);
}

function peakDay(points, key) {
  let best = null;
  for (const p of points ?? []) {
    const value = Number(p?.[key] ?? 0);
    if (best == null || value > best.value) best = { day: p.day, value };
  }
  return best;
}

function MetricCard({ label, value, tip, active, onClick, raw }) {
  return (
    <button
      type="button"
      className={`relative cursor-pointer overflow-visible px-3 py-3 text-left transition hover:bg-zinc-900/60 ${
        active ? "bg-zinc-900/40" : ""
      }`}
      onClick={onClick}
    >
      {active ? (
        <span className="absolute inset-x-0 top-0 h-0.5 bg-sky-400" />
      ) : null}
      <p className="text-[11px] text-zinc-500 sm:text-xs">
        {tip ? <StudioHoverTip text={tip}>{label}</StudioHoverTip> : label}
      </p>
      <p
        className={`mt-1 text-xl font-bold sm:text-2xl ${
          active ? "text-sky-300" : "text-zinc-100"
        }`}
      >
        {raw ? value : formatCompact(value)}
      </p>
    </button>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-100 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-600">{hint}</p> : null}
    </div>
  );
}

function SliceBars({ rows, emptyHint }) {
  if (!rows?.length) {
    return <p className="mt-3 text-sm text-zinc-500">{emptyHint}</p>;
  }
  return (
    <ul className="mt-4 space-y-2.5">
      {rows.map((row) => {
        const pct = Math.min(100, Math.max(0, Number(row.percent ?? 0)));
        return (
          <li key={row.id} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-zinc-400">
              {row.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <span
                className="block h-full rounded-full bg-sky-500/90"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-zinc-500">
              {pct.toFixed(0)}% · {formatCompact(row.count)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PanelHeading({ title, tip }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-white">
      {title}
      {tip ? (
        <StudioHoverTip underline={false} text={tip}>
          <span className="inline-flex text-zinc-500">
            <IoInformationCircleOutline className="h-4 w-4" aria-hidden />
          </span>
        </StudioHoverTip>
      ) : null}
    </h2>
  );
}

export function StudioAnalyticsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [metric, setMetric] = useState("views");
  const [viewerMetric, setViewerMetric] = useState("views");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(() => EMPTY_PAYLOAD(7));

  useEffect(() => {
    document.title = "VibelyStudio | Phân tích";
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const data = await apiClient.getStudioChannelAnalytics(token, {
            days,
          });
          if (cancelled) return;
          const points =
            Array.isArray(data?.points) && data.points.length
              ? data.points.map((p) => ({
                  day: String(p?.day ?? "").slice(0, 10),
                  views: Number(p?.views ?? 0),
                  profileViews: Number(p?.profileViews ?? 0),
                  likes: Number(p?.likes ?? 0),
                  comments: Number(p?.comments ?? 0),
                  shares: Number(p?.shares ?? 0),
                  newFollowers: Number(p?.newFollowers ?? 0),
                }))
              : buildZeroPoints(days);
          setPayload({
            days: Number(data?.days ?? days),
            totalViews: Number(data?.totalViews ?? 0),
            totalProfileViews: Number(data?.totalProfileViews ?? 0),
            totalLikes: Number(data?.totalLikes ?? 0),
            totalComments: Number(data?.totalComments ?? 0),
            totalShares: Number(data?.totalShares ?? 0),
            totalFollowers: Number(data?.totalFollowers ?? 0),
            newFollowers: Number(data?.newFollowers ?? 0),
            publishedVideoCount: Number(data?.publishedVideoCount ?? 0),
            periodPublishedVideoCount: Number(
              data?.periodPublishedVideoCount ?? 0,
            ),
            points,
            topVideos: Array.isArray(data?.topVideos) ? data.topVideos : [],
            trafficSources: Array.isArray(data?.trafficSources)
              ? data.trafficSources
              : [],
            searchKeywords: Array.isArray(data?.searchKeywords)
              ? data.searchKeywords
              : [],
            followerRegions: Array.isArray(data?.followerRegions)
              ? data.followerRegions
              : [],
            followerAgeBuckets: Array.isArray(data?.followerAgeBuckets)
              ? data.followerAgeBuckets
              : [],
          });
          setLoading(false);
          return;
        } catch (e) {
          if (attempt < maxAttempts) {
            await sleep(500);
            continue;
          }
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : "Không tải được thống kê.",
            );
            setPayload(EMPTY_PAYLOAD(days));
            setLoading(false);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  const points = payload.points ?? [];

  const metricTabs = useMemo(
    () => [
      {
        id: "views",
        label: "Lượt xem video",
        value: payload.totalViews,
        tip: "Số lần người xem đã xem video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "profileViews",
        label: "Lượt xem hồ sơ",
        value: payload.totalProfileViews,
        tip: "Số lần hồ sơ của bạn được xem trong khoảng thời gian đã chọn.",
      },
      {
        id: "likes",
        label: "Lượt thích",
        value: payload.totalLikes,
        tip: "Số lượt thích video của bạn nhận được trong khoảng thời gian đã chọn.",
      },
      {
        id: "comments",
        label: "Bình luận",
        value: payload.totalComments,
        tip: "Số bình luận trên video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "shares",
        label: "Chia sẻ",
        value: payload.totalShares,
        tip: "Số lần video của bạn được chia sẻ trong khoảng thời gian đã chọn.",
      },
      {
        id: "rewards",
        label: "Ước tính thưởng",
        value: "$0.00",
        raw: true,
        tip: "Chương trình thưởng cho nhà sáng tạo chưa mở tại khu vực của bạn.",
      },
    ],
    [payload],
  );

  const chartPoints = useMemo(() => {
    if (metric === "rewards") {
      return points.map((p) => ({ day: p.day, value: 0 }));
    }
    return points.map((p) => ({ day: p.day, value: Number(p[metric] ?? 0) }));
  }, [points, metric]);

  const viewerChartPoints = useMemo(
    () => points.map((p) => ({ day: p.day, value: Number(p[viewerMetric] ?? 0) })),
    [points, viewerMetric],
  );

  const followerChartPoints = useMemo(
    () => points.map((p) => ({ day: p.day, value: Number(p.newFollowers ?? 0) })),
    [points],
  );

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.days === days)?.label ?? `${days} ngày qua`;

  const avgViewsPerDay = days > 0 ? payload.totalViews / days : 0;
  const bestViewDay = useMemo(() => peakDay(points, "views"), [points]);
  const bestFollowerDay = useMemo(
    () => peakDay(points, "newFollowers"),
    [points],
  );
  const periodEngagement =
    payload.totalLikes + payload.totalComments + payload.totalShares;
  const engagementRate =
    payload.totalViews > 0 ? (periodEngagement / payload.totalViews) * 100 : 0;

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Phân tích</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Số liệu kênh của bạn trong {periodLabel.toLowerCase()}
        </p>
      </div>
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
  );

  const tabBar = (
    <nav className="mb-5 flex gap-6 overflow-x-auto border-b border-zinc-800/80 text-sm font-semibold sm:gap-8">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`relative -mb-px shrink-0 cursor-pointer pb-3 transition ${
            tab === t.id ? "text-sky-400" : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {t.label}
          {tab === t.id ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-sky-400" />
          ) : null}
        </button>
      ))}
    </nav>
  );

  const trafficBlock = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <PanelHeading
        title="Nguồn traffic"
        tip="Nơi người xem phát hiện video của bạn (For You, hồ sơ, tìm kiếm, …)."
      />
      <p className="mt-2 text-sm text-zinc-500">
        Phân tích nguồn truy cập sắp có.
      </p>
      <ul className="mt-4 space-y-2.5">
        {(payload.trafficSources.length
          ? payload.trafficSources
          : [{ id: "placeholder", label: "—", percent: null }]
        ).map((row) => {
          const pct =
            row.percent != null
              ? Math.min(100, Math.max(0, Number(row.percent)))
              : null;
          return (
            <li key={row.id} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-zinc-400">{row.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                {pct != null ? (
                  <span
                    className="block h-full rounded-full bg-sky-500/90"
                    style={{ width: `${pct}%` }}
                  />
                ) : (
                  <span className="block h-full w-0" />
                )}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">
                {pct != null ? `${pct.toFixed(0)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const searchBlock = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <PanelHeading
        title="Truy vấn tìm kiếm"
        tip="Các từ khóa tìm kiếm dẫn người xem tới video của bạn trong khoảng thời gian đã chọn."
      />
      {payload.searchKeywords.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">
          Mỗi truy vấn tìm kiếm hiện có lưu lượng thấp. Thông tin sẽ hiện khi có
          đủ dữ liệu.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {payload.searchKeywords.map((kw) => (
            <li key={kw.query} className="flex justify-between py-2 text-sm">
              <span className="text-zinc-200">{kw.query}</span>
              <span className="tabular-nums text-zinc-500">
                {formatCompact(kw.impressions)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const overviewTab = (
    <>
      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 overflow-visible border-b border-zinc-800/80 sm:grid-cols-3 lg:grid-cols-6">
          {metricTabs.map((t) => (
            <MetricCard
              key={t.id}
              label={t.label}
              value={t.value}
              tip={t.tip}
              raw={t.raw}
              active={metric === t.id}
              onClick={() => setMetric(t.id)}
            />
          ))}
        </div>
        <div className="p-4 sm:p-5">
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

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {trafficBlock}
        {searchBlock}
      </div>
    </>
  );

  const contentTab = (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Video đã đăng"
          value={formatCompact(payload.publishedVideoCount)}
          hint={`${formatCompact(payload.periodPublishedVideoCount)} video đăng trong kỳ`}
        />
        <StatCard
          label="Lượt xem trong kỳ"
          value={formatCompact(payload.totalViews)}
          hint={`Trung bình ${formatCompact(Math.round(avgViewsPerDay))}/ngày`}
        />
        <StatCard
          label="Tỷ lệ tương tác"
          value={`${engagementRate.toFixed(1)}%`}
          hint="(thích + bình luận + chia sẻ) / lượt xem"
        />
      </div>

      <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/80">
        <div className="border-b border-zinc-800/80 px-4 py-3">
          <PanelHeading
            title="Video hàng đầu"
            tip="Xếp theo lượt xem trong khoảng thời gian đã chọn."
          />
        </div>
        {payload.topVideos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Chưa có video nào được đăng trong kỳ này.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {payload.topVideos.map((v) => {
              const title =
                (v.description && String(v.description).trim()) ||
                v.title ||
                "Video";
              const dur = formatDuration(v.durationSeconds);
              return (
                <li key={v.publicId}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/60"
                    onClick={() =>
                      navigate(`/vibelystudio/analytics/${v.publicId}`)
                    }
                  >
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-800">
                      {v.thumbnailUrl ? (
                        <img
                          src={v.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-zinc-600">
                          <IoVideocamOutline className="h-5 w-5" aria-hidden />
                        </span>
                      )}
                      {dur ? (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                          {dur}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Đăng {formatDate(v.createdAt)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 gap-6 text-right sm:flex">
                      {[
                        { label: "Lượt xem", value: v.views },
                        { label: "Thích", value: v.likes },
                        { label: "Bình luận", value: v.comments },
                        { label: "Chia sẻ", value: v.shares },
                      ].map((col) => (
                        <span key={col.label} className="w-16">
                          <span className="block text-sm font-semibold tabular-nums text-zinc-100">
                            {formatCompact(col.value)}
                          </span>
                          <span className="block text-[11px] text-zinc-500">
                            {col.label}
                          </span>
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100 sm:hidden">
                      {formatCompact(v.views)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );

  const viewersTab = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lượt xem video"
          value={formatCompact(payload.totalViews)}
        />
        <StatCard
          label="Lượt xem hồ sơ"
          value={formatCompact(payload.totalProfileViews)}
        />
        <StatCard
          label="Trung bình mỗi ngày"
          value={formatCompact(Math.round(avgViewsPerDay))}
          hint={`Trên ${days} ngày`}
        />
        <StatCard
          label="Ngày cao nhất"
          value={
            bestViewDay && bestViewDay.value > 0
              ? formatCompact(bestViewDay.value)
              : "—"
          }
          hint={
            bestViewDay && bestViewDay.value > 0
              ? formatDay(bestViewDay.day)
              : "Chưa có lượt xem"
          }
        />
      </div>

      <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { id: "views", label: "Lượt xem video" },
            { id: "profileViews", label: "Lượt xem hồ sơ" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                viewerMetric === opt.id
                  ? "border-sky-500/60 bg-sky-500/10 text-sky-300"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
              }`}
              onClick={() => setViewerMetric(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 pt-10">
          <StudioTrendChart
            points={viewerChartPoints}
            formatValue={formatCompact}
            emptyHint="0 trong khoảng thời gian này"
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <PanelHeading
          title="Nhân khẩu học người xem"
          tip="Vibely chỉ thống kê nhân khẩu học khi người xem đã đăng nhập và có đủ dữ liệu."
        />
        <p className="mt-2 text-sm text-zinc-500">
          Bạn sẽ xem được thông tin này khi có đủ dữ liệu phân tích. Hiện tại
          xem phân bố khu vực và độ tuổi ở tab Người theo dõi.
        </p>
      </section>
    </>
  );

  const followersTab = (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng người theo dõi"
          value={formatCompact(payload.totalFollowers)}
        />
        <StatCard
          label="Người theo dõi mới"
          value={formatCompact(payload.newFollowers)}
          hint={periodLabel}
        />
        <StatCard
          label="Ngày tăng nhiều nhất"
          value={
            bestFollowerDay && bestFollowerDay.value > 0
              ? formatCompact(bestFollowerDay.value)
              : "—"
          }
          hint={
            bestFollowerDay && bestFollowerDay.value > 0
              ? formatDay(bestFollowerDay.day)
              : "Chưa có người theo dõi mới"
          }
        />
      </div>

      <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:p-5">
        <PanelHeading
          title="Người theo dõi mới theo ngày"
          tip="Số người bắt đầu theo dõi bạn trong từng ngày của khoảng thời gian đã chọn."
        />
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 pt-10">
          <StudioTrendChart
            points={followerChartPoints}
            formatValue={formatCompact}
            emptyHint="0 trong khoảng thời gian này"
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <PanelHeading
            title="Khu vực"
            tip="Khu vực tài khoản của những người đang theo dõi bạn."
          />
          <SliceBars
            rows={payload.followerRegions}
            emptyHint="Chưa có dữ liệu khu vực."
          />
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <PanelHeading
            title="Độ tuổi"
            tip="Tính theo ngày sinh mà người theo dõi đã khai báo."
          />
          <SliceBars
            rows={payload.followerAgeBuckets}
            emptyHint="Chưa có dữ liệu độ tuổi."
          />
        </section>
      </div>
    </>
  );

  return (
    <StudioLayout active="analytics" hidePageHeader hideTopBrand>
      {header}
      {tabBar}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="mb-3 text-sm text-zinc-500">Đang tải thống kê…</p>
      ) : null}

      {tab === "overview" ? overviewTab : null}
      {tab === "content" ? contentTab : null}
      {tab === "viewers" ? viewersTab : null}
      {tab === "followers" ? followersTab : null}
    </StudioLayout>
  );
}
