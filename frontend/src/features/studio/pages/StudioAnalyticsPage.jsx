import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const CONTENT_SORTS = [
  { id: "views", label: "Lượt xem nhiều nhất" },
  { id: "likes", label: "Lượt thích nhiều nhất" },
  { id: "comments", label: "Bình luận nhiều nhất" },
  { id: "shares", label: "Chia sẻ nhiều nhất" },
];

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const VIEWER_INSIGHT_HINT =
  "Dữ liệu sẽ hiển thị khi bài đăng của bạn đạt 100 người xem.";
const FOLLOWER_INSIGHT_HINT =
  "Nhận thêm thông tin chi tiết khi bạn đạt 100 người theo dõi.";

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

function deltaOf(current, previous) {
  if (previous == null) return null;
  const diff = Number(current ?? 0) - Number(previous ?? 0);
  const percent = previous > 0 ? (diff / previous) * 100 : null;
  return { diff, percent };
}

function DeltaText({ delta }) {
  if (!delta) {
    return <p className="mt-1 text-[11px] text-zinc-600 tabular-nums">0(--)</p>;
  }
  const { diff, percent } = delta;
  const pctText = percent == null ? "--" : `${Math.abs(percent).toFixed(1)}%`;
  const tone =
    diff > 0 ? "text-sky-400" : diff < 0 ? "text-rose-400" : "text-zinc-600";
  return (
    <p className={`mt-1 flex items-center gap-1 text-[11px] ${tone}`}>
      {diff !== 0 ? (
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            diff > 0 ? "bg-sky-400" : "bg-rose-400"
          }`}
        />
      ) : null}
      <span className="tabular-nums">
        {diff > 0 ? "+" : ""}
        {formatCompact(diff)}({pctText})
      </span>
    </p>
  );
}

function MetricCell({
  label,
  tip,
  tipAlign = "left",
  value,
  raw,
  delta,
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
      {tip ? (
        <span
          role="tooltip"
          className={`pointer-events-none absolute top-[calc(100%+6px)] z-40 w-max max-w-[240px] rounded-lg bg-zinc-800 px-3 py-2 text-left text-[11px] leading-snug font-normal text-white opacity-0 shadow-xl transition-opacity duration-100 group-hover/cell:opacity-100 ${
            alignRight ? "right-3" : "left-3"
          }`}
        >
          {tip}
          <span
            aria-hidden
            className={`absolute bottom-full border-[5px] border-transparent border-b-zinc-800 ${
              alignRight ? "right-4" : "left-4"
            }`}
          />
        </span>
      ) : null}
      <p className="truncate text-xs text-zinc-400">{label}</p>
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
        <DeltaText delta={delta} />
      )}
    </button>
  );
}

function PanelHeading({ title, tip }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-white">
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
    document.title = "VibelyStudio | Phân tích";
  }, []);

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
        label: "Lượt xem video",
        value: payload.totalViews,
        delta: deltaOf(payload.totalViews, previousTotals?.totalViews),
        tip: "Số lần người xem đã xem video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "profileViews",
        label: "Lượt xem hồ sơ",
        value: payload.totalProfileViews,
        delta: deltaOf(
          payload.totalProfileViews,
          previousTotals?.totalProfileViews,
        ),
        tip: "Số lần hồ sơ của bạn được xem trong khoảng thời gian đã chọn.",
      },
      {
        id: "likes",
        label: "Lượt thích",
        value: payload.totalLikes,
        delta: deltaOf(payload.totalLikes, previousTotals?.totalLikes),
        tip: "Số lượt thích video của bạn nhận được trong khoảng thời gian đã chọn.",
      },
      {
        id: "comments",
        label: "Bình luận",
        value: payload.totalComments,
        delta: deltaOf(payload.totalComments, previousTotals?.totalComments),
        tip: "Số bình luận trên video của bạn trong khoảng thời gian đã chọn.",
      },
      {
        id: "shares",
        label: "Chia sẻ",
        value: payload.totalShares,
        delta: deltaOf(payload.totalShares, previousTotals?.totalShares),
        tip: "Số lần video của bạn được chia sẻ trong khoảng thời gian đã chọn.",
      },
      {
        id: "rewards",
        label: "Ước tính thưởng",
        value: "$0.00",
        raw: true,
        delta: null,
        tip: "Do khác biệt về cách quy đổi tiền tệ và múi giờ, một số dữ liệu hiển thị có thể chênh lệch nhẹ so với các báo cáo khác.",
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
    return WEEKDAY_LABELS.map((label, idx) => ({ label, value: totals[idx] }));
  }, [points]);

  const sortedTopVideos = useMemo(() => {
    const rows = [...(payload.topVideos ?? [])];
    rows.sort(
      (a, b) => Number(b?.[contentSort] ?? 0) - Number(a?.[contentSort] ?? 0),
    );
    return rows;
  }, [payload.topVideos, contentSort]);

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.days === days)?.label ?? `${days} ngày qua`;

  const bestViewDay = useMemo(() => peakDay(points, "views"), [points]);

  const downloadCsv = useCallback(() => {
    const header = [
      "Ngày",
      "Lượt xem video",
      "Lượt xem hồ sơ",
      "Lượt thích",
      "Bình luận",
      "Chia sẻ",
      "Người theo dõi mới",
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
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
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
                  {opt.label}
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
              delta={cell.delta}
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
          title="Nguồn traffic"
          tip="Nơi người xem phát hiện video của bạn (For You, hồ sơ, tìm kiếm, …)."
        >
          <p className="mt-2 text-xs text-zinc-500">
            Bạn sẽ xem được thông tin này khi có đủ dữ liệu để phân tích.
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
          title="Truy vấn tìm kiếm"
          tip="Các từ khóa tìm kiếm dẫn người xem tới video của bạn trong khoảng thời gian đã chọn."
        >
          {payload.searchKeywords.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Mỗi truy vấn tìm kiếm hiện có lưu lượng thấp. Thông tin sẽ hiển
              thị khi có ít nhất 1 truy vấn đủ lưu lượng.
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
          title="Bài đăng hàng đầu"
          tip="Xếp hạng bài đăng theo số liệu trong khoảng thời gian đã chọn."
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
              {opt.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs font-normal text-zinc-500">
                <th className="px-4 py-3 font-normal">Bài đăng</th>
                <th className="px-4 py-3 text-right font-normal">
                  Lượt xem trong {days} ngày qua
                </th>
                <th className="px-4 py-3 text-right font-normal">Lượt thích</th>
                <th className="px-4 py-3 text-right font-normal">Bình luận</th>
                <th className="px-4 py-3 text-right font-normal">Chia sẻ</th>
                <th className="px-4 py-3 text-right font-normal">Ngày đăng</th>
                <th className="px-4 py-3 text-right font-normal">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sortedTopVideos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-24 text-center text-sm text-zinc-500"
                  >
                    Không có bài đăng hàng đầu
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
                          Xem phân tích
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
            label="Lượt xem video"
            tip="Số lần video của bạn được xem trong khoảng thời gian đã chọn."
            value={payload.totalViews}
            delta={deltaOf(payload.totalViews, previousTotals?.totalViews)}
            active={viewerMetric === "views"}
            onClick={() => setViewerMetric("views")}
          />
          <MetricCell
            label="Lượt xem hồ sơ"
            tip="Số lần hồ sơ của bạn được xem trong khoảng thời gian đã chọn."
            tipAlign="right"
            value={payload.totalProfileViews}
            delta={deltaOf(
              payload.totalProfileViews,
              previousTotals?.totalProfileViews,
            )}
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
            title="Thời điểm hoạt động nhiều nhất"
            tip="Khung giờ và ngày mà người xem của bạn hoạt động nhiều nhất."
          >
            <div className="mt-3 inline-flex rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
              {[
                { id: "hour", label: "Giờ" },
                { id: "day", label: "Ngày" },
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
                  {opt.label}
                </button>
              ))}
            </div>
            {activeTimeMode === "hour" ? (
              <>
                <p className="mt-3 text-xs text-zinc-500">
                  Thống kê theo khung giờ sẽ hiển thị khi bài đăng của bạn đạt
                  100 người xem.
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
                  Lượt xem theo thứ trong {periodLabel.toLowerCase()}.
                </p>
                <ColumnBars
                  items={weekdayItems}
                  emptyHint="Chưa có lượt xem trong khoảng thời gian này."
                />
              </>
            )}
          </Panel>

          <Panel
            title="Bài đăng người xem cũng đã xem"
            tip="Những bài đăng khác mà người xem của bạn cũng xem."
          >
            <p className="mt-2 text-xs text-zinc-500">{VIEWER_INSIGHT_HINT}</p>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Nhà sáng tạo người xem cũng đã xem"
            tip="Những nhà sáng tạo khác mà người xem của bạn quan tâm."
          >
            <p className="mt-2 text-xs text-zinc-500">{VIEWER_INSIGHT_HINT}</p>
          </Panel>
          <Panel title="Giới tính">
            <GenderDonut hint={VIEWER_INSIGHT_HINT} />
          </Panel>
          <Panel title="Độ tuổi">
            <LockedBars hint={VIEWER_INSIGHT_HINT} />
          </Panel>
          <Panel title="Vị trí" tip="Khu vực của những người đã xem video.">
            <LockedBars hint={VIEWER_INSIGHT_HINT} />
          </Panel>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Ngày nhiều lượt xem nhất:{" "}
        {bestViewDay && bestViewDay.value > 0
          ? `${formatDay(bestViewDay.day)} · ${formatCompact(bestViewDay.value)} lượt xem`
          : "chưa có dữ liệu"}
      </p>
    </>
  );

  const followersTab = (
    <>
      {payload.totalFollowers < 100 ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/90">
          <IoInformationCircleOutline className="shrink-0 text-base" aria-hidden />
          {FOLLOWER_INSIGHT_HINT}
        </div>
      ) : null}

      <section className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 divide-x divide-zinc-800/80 border-b border-zinc-800/80">
          <MetricCell
            label="Tổng người theo dõi"
            tip="Số người đang theo dõi bạn tính tới hiện tại."
            value={payload.totalFollowers}
            hint="Toàn thời gian"
            active={followerMetric === "total"}
            onClick={() => setFollowerMetric("total")}
          />
          <MetricCell
            label="Người theo dõi mới"
            tip="Số người bắt đầu theo dõi bạn trong khoảng thời gian đã chọn."
            tipAlign="right"
            value={payload.newFollowers}
            delta={deltaOf(payload.newFollowers, previousTotals?.newFollowers)}
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
          <Panel title="Giới tính">
            <GenderDonut hint={FOLLOWER_INSIGHT_HINT} />
          </Panel>
          <Panel
            title="Độ tuổi"
            tip="Tính theo ngày sinh mà người theo dõi đã khai báo."
          >
            {payload.followerAgeBuckets.length ? (
              <BarRows rows={payload.followerAgeBuckets} />
            ) : (
              <LockedBars hint={FOLLOWER_INSIGHT_HINT} />
            )}
          </Panel>
          <Panel
            title="Vị trí"
            tip="Khu vực tài khoản của những người đang theo dõi bạn."
          >
            {payload.followerRegions.length ? (
              <BarRows rows={payload.followerRegions} />
            ) : (
              <LockedBars hint={FOLLOWER_INSIGHT_HINT} />
            )}
          </Panel>
        </div>

        <Panel
          title="Thời điểm hoạt động nhiều nhất"
          tip="Khung giờ người theo dõi của bạn hoạt động nhiều nhất."
        >
          <p className="mt-2 text-xs text-zinc-500">{FOLLOWER_INSIGHT_HINT}</p>
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
        <p className="mb-3 text-sm text-zinc-500">Đang tải thống kê…</p>
      ) : null}

      {tab === "overview" ? overviewTab : null}
      {tab === "content" ? contentTab : null}
      {tab === "viewers" ? viewersTab : null}
      {tab === "followers" ? followersTab : null}
    </StudioLayout>
  );
}
