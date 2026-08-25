import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  IoChevronDown,
  IoDownloadOutline,
  IoInformationCircleOutline,
  IoVideocamOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioAccountMenu } from "@/features/studio/components/StudioAccountMenu";
import { StudioHoverTip } from "@/features/studio/components/StudioHoverTip";
import {
  StudioTrendChart,
  formatStudioMoney,
} from "@/features/studio/components/StudioTrendChart";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { StudioMetricDeltaLine } from "@/features/studio/components/StudioMetricDeltaLine.jsx";

const PERIOD_OPTIONS = [
  { days: 7, labelKey: "studio.period.d7" },
  { days: 28, labelKey: "studio.period.d28" },
  { days: 60, labelKey: "studio.period.d60" },
  { days: 90, labelKey: "studio.period.d90" },
];

const TABS = [
  { id: "overview", labelKey: "studio.analytics.tabs.overview" },
  { id: "content", labelKey: "studio.analytics.tabs.content" },
  { id: "viewers", labelKey: "studio.analytics.tabs.viewers" },
  { id: "followers", labelKey: "studio.analytics.tabs.followers" },
];

const CONTENT_SORTS = [
  { id: "views", labelKey: "studio.analytics.sorts.views" },
  { id: "likes", labelKey: "studio.analytics.sorts.likes" },
  { id: "comments", labelKey: "studio.analytics.sorts.comments" },
  { id: "shares", labelKey: "studio.analytics.sorts.shares" },
];

const WEEKDAY_KEYS = [
  "studio.analytics.weekdays.sun",
  "studio.analytics.weekdays.mon",
  "studio.analytics.weekdays.tue",
  "studio.analytics.weekdays.wed",
  "studio.analytics.weekdays.thu",
  "studio.analytics.weekdays.fri",
  "studio.analytics.weekdays.sat",
];

const VIEWER_INSIGHT_HINT_KEY = "studio.analytics.viewerInsightHint";
const FOLLOWER_INSIGHT_HINT_KEY = "studio.analytics.followerInsightHint";

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

function normalizePayload(data, days) {
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
  return {
    days: Number(data?.days ?? days),
    totalViews: Number(data?.totalViews ?? 0),
    totalProfileViews: Number(data?.totalProfileViews ?? 0),
    totalLikes: Number(data?.totalLikes ?? 0),
    totalComments: Number(data?.totalComments ?? 0),
    totalShares: Number(data?.totalShares ?? 0),
    totalFollowers: Number(data?.totalFollowers ?? 0),
    newFollowers: Number(data?.newFollowers ?? 0),
    publishedVideoCount: Number(data?.publishedVideoCount ?? 0),
    periodPublishedVideoCount: Number(data?.periodPublishedVideoCount ?? 0),
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
  };
}

function formatCompact(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000)
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000)
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sign}${Math.round(abs)}`;
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
    day: "2-digit",
    month: "2-digit",
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

function peakDay(points, key) {
  let best = null;
  for (const p of points ?? []) {
    const value = Number(p?.[key] ?? 0);
    if (best == null || value > best.value) best = { day: p.day, value };
  }
  return best;
}

function DeltaText({ current, previous, money = false }) {
  return (
    <StudioMetricDeltaLine
      current={current}
      previous={previous ?? 0}
      money={money}
      className="mt-1"
    />
  );
}

function MetricCell({
  label,
  tip,
  tipAlign = "left",
  value,
  raw,
  current,
  previous,
  money,
  active,
  onClick,
  hint,
}) {
  const alignRight = tipAlign === "right";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/cell relative cursor-pointer px-4 py-3.5 text-left transition ${
        active ? "bg-zinc-900/70" : "hover:bg-zinc-900/40"
      }`}
    >
      {active ? (
        <span className="absolute inset-x-0 top-0 h-0.5 bg-sky-400" />
      ) : null}
      <p className="relative text-xs text-zinc-400">
        <span className="block truncate">{label}</span>
        {tip ? (
          <span
            role="tooltip"
            className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-40 w-max max-w-[240px] rounded-lg bg-zinc-800 px-3 py-2 text-left text-[11px] leading-snug font-normal text-white opacity-0 shadow-xl transition-opacity duration-100 group-hover/cell:opacity-100 ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            {tip}
            <span
              aria-hidden
              className={`absolute top-full border-[5px] border-transparent border-t-zinc-800 ${
                alignRight ? "right-4" : "left-4"
              }`}
            />
          </span>
        ) : null}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold ${
          active ? "text-sky-300" : "text-zinc-100"
        }`}
      >
        {raw ? value : formatCompact(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>
      ) : (
        <DeltaText current={current ?? value} previous={previous} money={money} />
      )}
    </button>
  );
}

function PanelHeading({ title, tip, tipPlacement = "top" }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-white">
      {title}
      {tip ? (
        <StudioHoverTip underline={false} text={tip} placement={tipPlacement}>
          <span className="inline-flex text-zinc-500">
            <IoInformationCircleOutline className="h-4 w-4" aria-hidden />
          </span>
        </StudioHoverTip>
      ) : null}
    </h2>
  );
}

function Panel({ title, tip, right, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <PanelHeading title={title} tip={tip} />
        {right}
      </div>
      {children}
    </section>
  );
}

function BarRows({ rows }) {
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row, idx) => {
        const pct =
          row.percent == null
            ? null
            : Math.min(100, Math.max(0, Number(row.percent)));
        return (
          <li key={row.id ?? `row-${idx}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span
                className={`min-w-0 truncate ${
                  pct == null ? "text-zinc-600" : "text-zinc-300"
                }`}
              >
                {row.label ?? "-"}
              </span>
              <span
                className={`shrink-0 tabular-nums ${
                  pct == null ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                {pct == null ? "-%" : `${pct.toFixed(1)}%`}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800/80">
              {pct != null ? (
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${pct}%` }}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LockedBars({ hint, rows = 5 }) {
  return (
    <>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
      <BarRows
        rows={Array.from({ length: rows }, (_, i) => ({
          id: `locked-${i}`,
          label: "-",
          percent: null,
        }))}
      />
    </>
  );
}

function GenderDonut({ hint }) {
  return (
    <>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-3 flex items-center gap-5">
        <svg viewBox="0 0 120 72" className="h-[72px] w-[120px] shrink-0">
          <path
            d="M14 64 A46 46 0 0 1 106 64"
            fill="none"
            stroke="#27272a"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </svg>
        <ul className="min-w-0 flex-1 space-y-2 text-xs text-zinc-600">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-sm bg-zinc-700"
              />
              <span className="flex-1">-</span>
              <span className="tabular-nums">-%</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ColumnBars({ items, emptyHint }) {
  const max = Math.max(1, ...items.map((it) => Number(it.value ?? 0)));
  const hasData = items.some((it) => Number(it.value ?? 0) > 0);
  return (
    <>
      <div className="mt-4 flex h-40 items-end gap-1.5 border-b border-zinc-800 pb-0">
        {items.map((it) => {
          const value = Number(it.value ?? 0);
          const heightPct = hasData ? Math.max(2, (value / max) * 100) : 2;
          return (
            <div
              key={it.label}
              className="group/bar flex h-full min-w-0 flex-1 items-end"
              title={`${it.label}: ${formatCompact(value)}`}
            >
              <div
                className={`w-full rounded-t-sm transition ${
                  hasData ? "bg-sky-500 group-hover/bar:bg-sky-400" : "bg-zinc-800"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[11px] text-zinc-500">
        {items.map((it) => (
          <span key={it.label} className="min-w-0 flex-1 truncate text-center">
            {it.label}
          </span>
        ))}
      </div>
      {!hasData && emptyHint ? (
        <p className="mt-3 text-xs text-zinc-500">{emptyHint}</p>
      ) : null}
    </>
  );
}

export function StudioAnalyticsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [metric, setMetric] = useState("views");
  const [viewerMetric, setViewerMetric] = useState("views");
  const [followerMetric, setFollowerMetric] = useState("total");
  const [contentSort, setContentSort] = useState("views");
  const [activeTimeMode, setActiveTimeMode] = useState("hour");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(() => EMPTY_PAYLOAD(7));
  const [previous, setPrevious] = useState(null);

  useEffect(() => {
    document.title = t("studio.docTitle.analytics");
  }, [t]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setPrevious(null);

    (async () => {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const data = await apiClient.getStudioChannelAnalytics(token, {
            days,
          });
          if (cancelled) return;
          setPayload(normalizePayload(data, days));
          setLoading(false);
          return;
        } catch (e) {
          if (attempt < maxAttempts) {
            await sleep(500);
            continue;
          }
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : t("studio.analytics.loadFailed"),
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

  // Kỳ liền trước = (2N ngày) − (N ngày); backend cũ không nhận 2N nên bỏ qua im lặng.
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const doubled = await apiClient.getStudioChannelAnalytics(token, {
          days: days * 2,
        });
        if (cancelled) return;
        setPrevious(normalizePayload(doubled, days * 2));
      } catch {
        if (!cancelled) setPrevious(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  const points = payload.points ?? [];

  const previousTotals = useMemo(() => {
    if (!previous) return null;
    const back = (key) =>
      Math.max(0, Number(previous[key] ?? 0) - Number(payload[key] ?? 0));
    return {
      totalViews: back("totalViews"),
      totalProfileViews: back("totalProfileViews"),
      totalLikes: back("totalLikes"),
      totalComments: back("totalComments"),
      totalShares: back("totalShares"),
      newFollowers: back("newFollowers"),
    };
  }, [previous, payload]);

  const metricCells = useMemo(
    () => [
      {
        id: "views",
        label: t("studio.metrics.videoViews"),
        value: payload.totalViews,
        previous: previousTotals?.totalViews ?? 0,
        tip: t("studio.metrics.videoViewsTip"),
      },
      {
        id: "profileViews",
        label: t("studio.metrics.profileViews"),
        value: payload.totalProfileViews,
        previous: previousTotals?.totalProfileViews ?? 0,
        tip: t("studio.metrics.profileViewsTip"),
      },
      {
        id: "likes",
        label: t("studio.metrics.likes"),
        value: payload.totalLikes,
        previous: previousTotals?.totalLikes ?? 0,
        tip: t("studio.metrics.likesTip"),
      },
      {
        id: "comments",
        label: t("studio.metrics.comments"),
        value: payload.totalComments,
        previous: previousTotals?.totalComments ?? 0,
        tip: t("studio.metrics.commentsTip"),
      },
      {
        id: "shares",
        label: t("studio.metrics.shares"),
        value: payload.totalShares,
        previous: previousTotals?.totalShares ?? 0,
        tip: t("studio.metrics.sharesTip"),
      },
      {
        id: "rewards",
        label: t("studio.metrics.rewards"),
        value: "$0.00",
        raw: true,
        money: true,
        previous: 0,
        tip: t("studio.metrics.rewardsTipLong"),
      },
    ],
    [payload, previousTotals],
  );

  const chartPoints = useMemo(() => {
    if (metric === "rewards") {
      return points.map((p) => ({ day: p.day, value: 0 }));
    }
    return points.map((p) => ({ day: p.day, value: Number(p[metric] ?? 0) }));
  }, [points, metric]);

  const viewerChartPoints = useMemo(
    () =>
      points.map((p) => ({ day: p.day, value: Number(p[viewerMetric] ?? 0) })),
    [points, viewerMetric],
  );

  // Tổng người theo dõi cuối mỗi ngày, suy ngược từ tổng hiện tại.
  const followerTotalSeries = useMemo(() => {
    const out = new Array(points.length);
    let after = 0;
    for (let i = points.length - 1; i >= 0; i -= 1) {
      out[i] = {
        day: points[i].day,
        value: Math.max(0, payload.totalFollowers - after),
      };
      after += Number(points[i].newFollowers ?? 0);
    }
    return out;
  }, [points, payload.totalFollowers]);

  const followerChartPoints = useMemo(
    () =>
      followerMetric === "total"
        ? followerTotalSeries
        : points.map((p) => ({
            day: p.day,
            value: Number(p.newFollowers ?? 0),
          })),
    [followerMetric, followerTotalSeries, points],
  );

  const weekdayItems = useMemo(() => {
    const totals = new Array(7).fill(0);
    for (const p of points) {
      const d = new Date(`${String(p.day).slice(0, 10)}T12:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      totals[d.getDay()] += Number(p.views ?? 0);
    }
    return WEEKDAY_KEYS.map((k) => t(k)).map((label, idx) => ({ label, value: totals[idx] }));
  }, [points]);

  const sortedTopVideos = useMemo(() => {
    const rows = [...(payload.topVideos ?? [])];
    rows.sort(
      (a, b) => Number(b?.[contentSort] ?? 0) - Number(a?.[contentSort] ?? 0),
    );
    return rows;
  }, [payload.topVideos, contentSort]);

  const periodLabel =
    (PERIOD_OPTIONS.find((o) => o.days === days) ? t(PERIOD_OPTIONS.find((o) => o.days === days).labelKey) : null) ??
    t('studio.editPost.daysAgo', { days });

  const bestViewDay = useMemo(() => peakDay(points, "views"), [points]);

  const downloadCsv = useCallback(() => {
    const header = [
      t("studio.analytics.day"),
      t("studio.metrics.videoViews"),
      t("studio.metrics.profileViews"),
      t("studio.metrics.likes"),
      t("studio.metrics.comments"),
      t("studio.metrics.shares"),
      t("studio.analytics.newFollowers"),
    ];
    const rows = points.map((p) => [
      p.day,
      p.views,
      p.profileViews,
      p.likes,
      p.comments,
      p.shares,
      p.newFollowers,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vibely-phan-tich-${days}-ngay.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [points, days]);

  const topBar = (
    <div className="mb-5 flex items-center justify-between gap-3">
      <nav className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto border-b border-zinc-800">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 cursor-pointer px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
              tab === tabItem.id
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            onClick={() => setPeriodOpen((o) => !o)}
            aria-expanded={periodOpen}
          >
            {periodLabel}
            <IoChevronDown className="text-zinc-500" aria-hidden />
          </button>
          {periodOpen ? (
            <div className="absolute right-0 z-30 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
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
        <button
          type="button"
          onClick={downloadCsv}
          className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 sm:inline-flex"
        >
          <IoDownloadOutline aria-hidden />
          Tải dữ liệu
        </button>
        <StudioAccountMenu />
      </div>
    </div>
  );

  const overviewTab = (
    <>
      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 divide-x divide-zinc-800/80 overflow-visible border-b border-zinc-800/80 sm:grid-cols-3 lg:grid-cols-6">
          {metricCells.map((cell, idx) => (
            <MetricCell
              key={cell.id}
              label={cell.label}
              tip={cell.tip}
              tipAlign={idx >= metricCells.length - 2 ? "right" : "left"}
              value={cell.value}
              raw={cell.raw}
              previous={cell.previous}
              money={cell.money}
              active={metric === cell.id}
              onClick={() => setMetric(cell.id)}
            />
          ))}
        </div>
        <div className="px-3 pb-4 pt-10 sm:px-5">
          <StudioTrendChart
            points={chartPoints}
            formatValue={
              metric === "rewards" ? formatStudioMoney : formatCompact
            }
            scale={metric === "rewards" ? "money" : "count"}
            yMax={metric === "rewards" ? 1.2 : undefined}
            emptyHint={null}
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title={t("studio.analytics.trafficSources")}
          tip={t("studio.analytics.trafficSourcesTip")}
        >
          <p className="mt-2 text-xs text-zinc-500">
            {t("studio.analytics.needMoreData")}
          </p>
          <BarRows
            rows={
              payload.trafficSources.length
                ? payload.trafficSources
                : Array.from({ length: 5 }, (_, i) => ({
                    id: `traffic-${i}`,
                    label: "-",
                    percent: null,
                  }))
            }
          />
        </Panel>
        <Panel
          title={t("studio.analytics.searchQueries")}
          tip={t("studio.analytics.searchTip")}
        >
          {payload.searchKeywords.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              {t("studio.analytics.searchLowTraffic")}
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
        </Panel>
      </div>
    </>
  );

  const contentTab = (
    <>
      <div className="mb-3">
        <PanelHeading
          title={t("studio.analytics.topPosts")}
          tipPlacement="bottom"
          tip={t("studio.analytics.topPostsTip", { days })}
        />
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2 sm:px-4">
          {CONTENT_SORTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setContentSort(opt.id)}
              className={`shrink-0 cursor-pointer px-3 py-2.5 text-xs font-semibold transition ${
                contentSort === opt.id
                  ? "border-b-2 border-zinc-100 text-zinc-100"
                  : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs font-normal text-zinc-500">
                <th className="px-4 py-3 font-normal">{t("studio.analytics.post")}</th>
                <th className="px-4 py-3 text-right font-normal">
                  {t("studio.analytics.viewsInDays", { days })}
                </th>
                <th className="px-4 py-3 text-right font-normal">{t("studio.analytics.likes")}</th>
                <th className="px-4 py-3 text-right font-normal">{t("studio.analytics.comments")}</th>
                <th className="px-4 py-3 text-right font-normal">{t("studio.analytics.shares")}</th>
                <th className="px-4 py-3 text-right font-normal">{t("studio.analytics.postedDate")}</th>
                <th className="px-4 py-3 text-right font-normal">{t("studio.analytics.action")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTopVideos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-24 text-center text-sm text-zinc-500"
                  >
                    {t("studio.analytics.noTopPosts")}
                  </td>
                </tr>
              ) : (
                sortedTopVideos.map((v) => {
                  const title =
                    (v.description && String(v.description).trim()) ||
                    v.title ||
                    "Video";
                  const dur = formatDuration(v.durationSeconds);
                  return (
                    <tr
                      key={v.publicId}
                      className="border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
                            {v.thumbnailUrl ? (
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-zinc-600">
                                <IoVideocamOutline
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                              </span>
                            )}
                            {dur ? (
                              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                                {dur}
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 max-w-[260px] text-sm text-zinc-100">
                            {title}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                        {formatCompact(v.views)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                        {formatCompact(v.likes)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                        {formatCompact(v.comments)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                        {formatCompact(v.shares)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">
                        {formatDate(v.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="cursor-pointer text-xs font-semibold text-sky-400 hover:text-sky-300"
                          onClick={() =>
                            navigate(`/vibelystudio/analytics/${v.publicId}`)
                          }
                        >
                          {t("studio.analytics.viewAnalytics")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const viewersTab = (
    <>
      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 divide-x divide-zinc-800/80 border-b border-zinc-800/80">
          <MetricCell
            label={t("studio.metrics.videoViews")}
            tip={t("studio.analytics.videoViewsTip")}
            value={payload.totalViews}
            previous={previousTotals?.totalViews ?? 0}
            active={viewerMetric === "views"}
            onClick={() => setViewerMetric("views")}
          />
          <MetricCell
            label={t("studio.metrics.profileViews")}
            tip={t("studio.metrics.profileViewsTip")}
            tipAlign="right"
            value={payload.totalProfileViews}
            previous={previousTotals?.totalProfileViews ?? 0}
            active={viewerMetric === "profileViews"}
            onClick={() => setViewerMetric("profileViews")}
          />
        </div>
        <div className="px-3 pb-4 pt-10 sm:px-5">
          <StudioTrendChart
            points={viewerChartPoints}
            formatValue={formatCompact}
            emptyHint={null}
          />
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel
            title={t("studio.analytics.peakActivity")}
            tip={t("studio.analytics.peakTip")}
          >
            <div className="mt-3 inline-flex rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
              {[
                { id: "hour", labelKey: "studio.analytics.hour" },
                { id: "day", label: t("studio.analytics.day") },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveTimeMode(opt.id)}
                  className={`cursor-pointer rounded px-3 py-1 font-medium transition ${
                    activeTimeMode === opt.id
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
            {activeTimeMode === "hour" ? (
              <>
                <p className="mt-3 text-xs text-zinc-500">
                  {t("studio.analytics.peakHourHint")}
                </p>
                <ColumnBars
                  items={Array.from({ length: 12 }, (_, i) => ({
                    label: `${i * 2}h`,
                    value: 0,
                  }))}
                />
              </>
            ) : (
              <>
                <p className="mt-3 text-xs text-zinc-500">
                  {t("studio.analytics.viewsByWeekday", { period: periodLabel.toLowerCase() })}
                </p>
                <ColumnBars
                  items={weekdayItems}
                  emptyHint={t("studio.analytics.noViewsInPeriod")}
                />
              </>
            )}
          </Panel>

          <Panel
            title={t("studio.analytics.alsoWatchedPosts")}
            tip={t("studio.analytics.alsoWatchedPostsTip")}
          >
            <p className="mt-2 text-xs text-zinc-500">{t(VIEWER_INSIGHT_HINT_KEY)}</p>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={t("studio.analytics.alsoWatchedCreators")}
            tip={t("studio.analytics.alsoWatchedCreatorsTip")}
          >
            <p className="mt-2 text-xs text-zinc-500">{t(VIEWER_INSIGHT_HINT_KEY)}</p>
          </Panel>
          <Panel title={t("studio.analytics.gender")}>
            <GenderDonut hint={t(VIEWER_INSIGHT_HINT_KEY)} />
          </Panel>
          <Panel title={t("studio.analytics.age")}>
            <LockedBars hint={t(VIEWER_INSIGHT_HINT_KEY)} />
          </Panel>
          <Panel title={t("studio.analytics.location")} tip={t("studio.analytics.locationTip")}>
            <LockedBars hint={t(VIEWER_INSIGHT_HINT_KEY)} />
          </Panel>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        {t("studio.analytics.bestViewDay")}{" "}
        {bestViewDay && bestViewDay.value > 0
          ? t("studio.analytics.bestViewDayValue", { day: formatDay(bestViewDay.day), count: formatCompact(bestViewDay.value) })
          : t("studio.analytics.noData")}
      </p>
    </>
  );

  const followersTab = (
    <>
      {payload.totalFollowers < 100 ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/90">
          <IoInformationCircleOutline className="shrink-0 text-base" aria-hidden />
          {t(FOLLOWER_INSIGHT_HINT_KEY)}
        </div>
      ) : null}

      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 divide-x divide-zinc-800/80 border-b border-zinc-800/80">
          <MetricCell
            label={t("studio.analytics.totalFollowers")}
            tip={t("studio.analytics.totalFollowersTip")}
            value={payload.totalFollowers}
            hint={t("studio.analytics.allTime")}
            active={followerMetric === "total"}
            onClick={() => setFollowerMetric("total")}
          />
          <MetricCell
            label={t("studio.analytics.newFollowers")}
            tip={t("studio.analytics.newFollowersTip")}
            tipAlign="right"
            value={payload.newFollowers}
            previous={previousTotals?.newFollowers ?? 0}
            active={followerMetric === "new"}
            onClick={() => setFollowerMetric("new")}
          />
        </div>
        <div className="px-3 pb-4 pt-10 sm:px-5">
          <StudioTrendChart
            points={followerChartPoints}
            formatValue={formatCompact}
            emptyHint={null}
          />
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title={t("studio.analytics.gender")}>
            <GenderDonut hint={t(FOLLOWER_INSIGHT_HINT_KEY)} />
          </Panel>
          <Panel
            title={t("studio.analytics.age")}
            tip={t("studio.analytics.ageTip")}
          >
            {payload.followerAgeBuckets.length ? (
              <BarRows rows={payload.followerAgeBuckets} />
            ) : (
              <LockedBars hint={t(FOLLOWER_INSIGHT_HINT_KEY)} />
            )}
          </Panel>
          <Panel
            title={t("studio.analytics.location")}
            tip={t("studio.analytics.locationTip")}
          >
            {payload.followerRegions.length ? (
              <BarRows rows={payload.followerRegions} />
            ) : (
              <LockedBars hint={t(FOLLOWER_INSIGHT_HINT_KEY)} />
            )}
          </Panel>
        </div>

        <Panel
          title={t("studio.analytics.peakActivity")}
          tip={t("studio.analytics.followerPeakTip")}
        >
          <p className="mt-2 text-xs text-zinc-500">{t(FOLLOWER_INSIGHT_HINT_KEY)}</p>
          <ColumnBars
            items={Array.from({ length: 12 }, (_, i) => ({
              label: `${i * 2}h`,
              value: 0,
            }))}
          />
        </Panel>
      </div>
    </>
  );

  return (
    <StudioLayout active="analytics" hidePageHeader hideTopBar>
      {topBar}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="mb-3 text-sm text-zinc-500">{t("studio.analytics.loading")}</p>
      ) : null}

      {tab === "overview" ? overviewTab : null}
      {tab === "content" ? contentTab : null}
      {tab === "viewers" ? viewersTab : null}
      {tab === "followers" ? followersTab : null}
    </StudioLayout>
  );
}
