import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  IoBarChartOutline,
  IoPeopleOutline,
  IoPulseOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoVideocamOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { adminApi } from "@/features/admin/api";
import { AdminLayout } from "@/features/admin/components/AdminLayout.jsx";
import { useAuth } from "@/features/auth/hooks/useAuth.js";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const COLORS = {
  users: "#7b61ff",
  videos: "#38bdf8",
  reports: "#ff6b6b",
  views: "#34d399",
  published: "#34d399",
  draft: "#a1a1aa",
  flagged: "#f59e0b",
  removed: "#fe2c55",
};

function pctChange(arr) {
  if (!arr?.length || arr.length < 4) return 0;
  const mid = Math.floor(arr.length / 2);
  const first = arr.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const second = arr.slice(mid).reduce((a, b) => a + b, 0) / (arr.length - mid);
  if (!first) return second > 0 ? 100 : 0;
  return ((second - first) / first) * 100;
}

function formatDayLabel(isoDay) {
  const raw = String(isoDay || "");
  const m = raw.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : raw;
}

function formatCompact(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return String(v);
}

function buildAiInsights(series, t) {
  const newUsers = series.map((d) => d.newUsers);
  const newVideos = series.map((d) => d.newVideos);
  const reports = series.map((d) => d.reports);
  const views = series.map((d) => d.views);
  const labels = series.map((d) => formatDayLabel(d.day));

  const userPct = pctChange(newUsers);
  const videoPct = pctChange(newVideos);
  const reportPct = pctChange(reports);
  const viewPct = pctChange(views);
  const peakVideoIdx = newVideos.indexOf(Math.max(...newVideos, 0));
  const peakReportIdx = reports.indexOf(Math.max(...reports, 0));
  const videoSum = newVideos.reduce((a, b) => a + b, 0);
  const reportSum = reports.reduce((a, b) => a + b, 0);
  const reportRatio = videoSum > 0 ? (reportSum / videoSum) * 100 : 0;
  const tone = (pct) => (pct >= 8 ? "up" : pct <= -8 ? "down" : "flat");

  return [
    {
      id: "users",
      tone: tone(userPct),
      text: t("admin.dashboard.ai.usersTrend", {
        pct: Math.abs(userPct).toFixed(1),
        dir: userPct >= 0 ? t("admin.dashboard.ai.up") : t("admin.dashboard.ai.down"),
      }),
    },
    {
      id: "videos",
      tone: tone(videoPct),
      text: t("admin.dashboard.ai.videosTrend", {
        pct: Math.abs(videoPct).toFixed(1),
        dir: videoPct >= 0 ? t("admin.dashboard.ai.up") : t("admin.dashboard.ai.down"),
        peak: labels[peakVideoIdx] || "—",
      }),
    },
    {
      id: "moderation",
      tone: tone(reportPct),
      text: t("admin.dashboard.ai.moderationTrend", {
        pct: Math.abs(reportPct).toFixed(1),
        dir: reportPct >= 0 ? t("admin.dashboard.ai.up") : t("admin.dashboard.ai.down"),
        ratio: reportRatio.toFixed(1),
        peak: labels[peakReportIdx] || "—",
      }),
    },
    {
      id: "views",
      tone: tone(viewPct),
      text: t("admin.dashboard.ai.viewsTrend", {
        pct: Math.abs(viewPct).toFixed(1),
        dir: viewPct >= 0 ? t("admin.dashboard.ai.up") : t("admin.dashboard.ai.down"),
      }),
    },
  ];
}

function chartTheme(isLight) {
  return {
    tick: isLight ? "#71717a" : "#94a3b8",
    grid: isLight ? "rgba(113, 113, 122, 0.18)" : "rgba(148, 163, 184, 0.18)",
    tooltipBg: isLight ? "rgba(255,255,255,0.96)" : "rgba(15, 17, 23, 0.95)",
    tooltipTitle: isLight ? "#18181b" : "#f1f5f9",
    tooltipBody: isLight ? "#3f3f46" : "#e2e8f0",
    tooltipBorder: isLight ? "rgba(0,0,0,0.08)" : "rgba(148, 163, 184, 0.25)",
    pointFill: isLight ? "#ffffff" : "#0f1117",
    card: isLight
      ? "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
      : "rounded-2xl border border-zinc-700/70 bg-[#1e222d] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)] sm:p-5",
    cardTitle: isLight
      ? "mb-3 flex items-center gap-2 text-[15px] font-semibold text-zinc-900"
      : "mb-3 flex items-center gap-2 text-[15px] font-semibold text-zinc-100",
    cardIcon: isLight ? "text-lg text-zinc-500" : "text-lg text-zinc-300",
    kpi: isLight
      ? "rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
      : "rounded-xl border border-zinc-700/70 bg-[#1e222d] px-4 py-3",
    kpiLabel: isLight ? "text-xs text-zinc-500" : "text-xs text-zinc-400",
    kpiValue: isLight
      ? "mt-1 text-2xl font-bold text-zinc-900 tabular-nums"
      : "mt-1 text-2xl font-bold text-white tabular-nums",
    insight: isLight
      ? "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
      : "rounded-2xl border border-zinc-700/70 bg-[#1e222d] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)] sm:p-5",
  };
}

function baseOptions(theme, { suggestedMax } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: theme.tick,
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipTitle,
        bodyColor: theme.tooltipBody,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: theme.grid, borderDash: [4, 4], drawBorder: false },
        ticks: {
          color: theme.tick,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax,
        grid: { color: theme.grid, borderDash: [4, 4], drawBorder: false },
        ticks: { color: theme.tick, precision: 0 },
      },
    },
  };
}

function ChartCard({ theme, icon: Icon, title, children }) {
  return (
    <section className={`${theme.card} flex min-h-[320px] flex-col`}>
      <div className={theme.cardTitle}>
        <Icon className={theme.cardIcon} aria-hidden />
        <h2>{title}</h2>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

function emptyDashboard() {
  return {
    days: 14,
    totals: { users: 0, videos: 0, reports: 0, views: 0 },
    statusMix: { published: 0, draft: 0, flagged: 0, removed: 0 },
    series: [],
  };
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { token, authReady } = useAuth();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const theme = useMemo(() => chartTheme(isLight), [isLight]);

  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("admin.docTitle.dashboard");
  }, [t]);

  useEffect(() => {
    if (!authReady) return undefined;
    if (!token) {
      setLoading(false);
      setError(t("errors.AUTH_REQUIRED"));
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const payload = await adminApi.getAdminDashboard(token, { days: 14 });
        if (cancelled) return;
        setData({
          days: Number(payload?.days) || 14,
          totals: {
            users: Number(payload?.totals?.users) || 0,
            videos: Number(payload?.totals?.videos) || 0,
            reports: Number(payload?.totals?.reports) || 0,
            views: Number(payload?.totals?.views) || 0,
          },
          statusMix: {
            published: Number(payload?.statusMix?.published) || 0,
            draft: Number(payload?.statusMix?.draft) || 0,
            flagged: Number(payload?.statusMix?.flagged) || 0,
            removed: Number(payload?.statusMix?.removed) || 0,
          },
          series: Array.isArray(payload?.series) ? payload.series : [],
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || t("errors.GENERIC"));
        setData(emptyDashboard());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, token, t]);

  const labels = useMemo(
    () => data.series.map((d) => formatDayLabel(d.day)),
    [data.series],
  );
  const insights = useMemo(
    () => (data.series.length ? buildAiInsights(data.series, t) : []),
    [data.series, t],
  );

  const usersLine = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("admin.dashboard.series.totalUsers"),
          data: data.series.map((d) => Number(d.totalUsers) || 0),
          borderColor: COLORS.users,
          backgroundColor: "rgba(123, 97, 255, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: theme.pointFill,
          pointBorderColor: COLORS.users,
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
        {
          label: t("admin.dashboard.series.newUsers"),
          data: data.series.map((d) => Number(d.newUsers) || 0),
          borderColor: "#c4b5fd",
          backgroundColor: "#c4b5fd",
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2,
          yAxisID: "y1",
        },
      ],
    }),
    [data.series, labels, t, theme.pointFill],
  );

  const usersOptions = useMemo(() => {
    const base = baseOptions(theme);
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales.y,
          title: {
            display: true,
            text: t("admin.dashboard.axis.totalUsers"),
            color: theme.tick,
          },
        },
        y1: {
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: theme.tick, precision: 0 },
          title: {
            display: true,
            text: t("admin.dashboard.axis.newUsers"),
            color: theme.tick,
          },
        },
      },
    };
  }, [theme, t]);

  const videosBar = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("admin.dashboard.series.newVideos"),
          data: data.series.map((d) => Number(d.newVideos) || 0),
          backgroundColor: COLORS.videos,
          borderRadius: 4,
          barPercentage: 0.75,
        },
        {
          label: t("admin.dashboard.series.reports"),
          data: data.series.map((d) => Number(d.reports) || 0),
          backgroundColor: COLORS.reports,
          borderRadius: 4,
          barPercentage: 0.75,
        },
      ],
    }),
    [data.series, labels, t],
  );

  const videosOptions = useMemo(() => {
    const maxVal = Math.max(
      0,
      ...data.series.map((d) => Number(d.newVideos) || 0),
      ...data.series.map((d) => Number(d.reports) || 0),
    );
    return baseOptions(theme, { suggestedMax: maxVal > 0 ? maxVal + 2 : 5 });
  }, [theme, data.series]);

  const viewsLine = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("admin.dashboard.series.views"),
          data: data.series.map((d) => Number(d.views) || 0),
          borderColor: COLORS.views,
          backgroundColor: "rgba(52, 211, 153, 0.18)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: theme.pointFill,
          pointBorderColor: COLORS.views,
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
      ],
    }),
    [data.series, labels, t, theme.pointFill],
  );

  const viewsOptions = useMemo(() => {
    const maxVal = Math.max(0, ...data.series.map((d) => Number(d.views) || 0));
    const base = baseOptions(theme, {
      suggestedMax: maxVal > 0 ? Math.ceil(maxVal * 1.1) : 5,
    });
    return {
      ...base,
      plugins: { ...base.plugins, legend: { display: false } },
    };
  }, [theme, data.series]);

  const statusTotal =
    data.statusMix.published +
    data.statusMix.draft +
    data.statusMix.flagged +
    data.statusMix.removed;

  const statusDonut = useMemo(() => {
    const toPct = (n) =>
      statusTotal > 0 ? Math.round((Number(n) / statusTotal) * 1000) / 10 : 0;
    return {
      labels: [
        t("admin.dashboard.status.published"),
        t("admin.dashboard.status.draft"),
        t("admin.dashboard.status.flagged"),
        t("admin.dashboard.status.removed"),
      ],
      datasets: [
        {
          data: [
            toPct(data.statusMix.published),
            toPct(data.statusMix.draft),
            toPct(data.statusMix.flagged),
            toPct(data.statusMix.removed),
          ],
          backgroundColor: [
            COLORS.published,
            COLORS.draft,
            COLORS.flagged,
            COLORS.removed,
          ],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [data.statusMix, statusTotal, t]);

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: theme.tick, padding: 14, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
          },
        },
      },
      cutout: "62%",
    }),
    [theme],
  );

  const toneClass = (tone) => {
    if (tone === "up") return "text-emerald-500";
    if (tone === "down") return "text-rose-500";
    return isLight ? "text-zinc-500" : "text-zinc-400";
  };

  return (
    <AdminLayout
      active="dashboard"
      title={t("admin.dashboard.title")}
      subtitle={t("admin.dashboard.subtitle")}
    >
      {loading ? (
        <p className={isLight ? "text-zinc-500" : "text-zinc-400"}>
          {t("admin.loading")}
        </p>
      ) : error ? (
        <p className="text-rose-500">{error}</p>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={theme.kpi}>
              <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
                <IoPeopleOutline aria-hidden />
                {t("admin.dashboard.kpi.users")}
              </p>
              <p className={theme.kpiValue}>
                {formatCompact(data.totals.users)}
              </p>
            </div>
            <div className={theme.kpi}>
              <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
                <IoVideocamOutline aria-hidden />
                {t("admin.dashboard.kpi.videos")}
              </p>
              <p className={theme.kpiValue}>
                {formatCompact(data.totals.videos)}
              </p>
            </div>
            <div className={theme.kpi}>
              <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
                <IoWarningOutline aria-hidden />
                {t("admin.dashboard.kpi.reports")}
              </p>
              <p className={`${theme.kpiValue} !text-[#ff6b6b]`}>
                {formatCompact(data.totals.reports)}
              </p>
            </div>
            <div className={theme.kpi}>
              <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
                <IoPulseOutline aria-hidden />
                {t("admin.dashboard.kpi.views")}
              </p>
              <p className={`${theme.kpiValue} !text-[#34d399]`}>
                {formatCompact(data.totals.views)}
              </p>
            </div>
          </div>

          <section className={theme.insight}>
            <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
              <IoSparklesOutline className="text-lg text-[#fe2c55]" aria-hidden />
              <h2>{t("admin.dashboard.ai.title")}</h2>
            </div>
            <p
              className={`mb-3 text-[13px] ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
            >
              {t("admin.dashboard.ai.intro")}
            </p>
            {insights.length ? (
              <ul className="space-y-2.5">
                {insights.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${
                      isLight
                        ? "bg-zinc-50 text-zinc-700"
                        : "bg-zinc-900/60 text-zinc-200"
                    }`}
                  >
                    <span className={`mr-2 font-semibold ${toneClass(item.tone)}`}>
                      ●
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={isLight ? "text-zinc-500" : "text-zinc-400"}>
                {t("admin.dashboard.ai.empty")}
              </p>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              theme={theme}
              icon={IoPeopleOutline}
              title={t("admin.dashboard.charts.usersGrowth")}
            >
              <Line data={usersLine} options={usersOptions} />
            </ChartCard>
            <ChartCard
              theme={theme}
              icon={IoBarChartOutline}
              title={t("admin.dashboard.charts.videosReports")}
            >
              <Bar data={videosBar} options={videosOptions} />
            </ChartCard>
            <ChartCard
              theme={theme}
              icon={IoStatsChartOutline}
              title={t("admin.dashboard.charts.viewsTrend")}
            >
              <Line data={viewsLine} options={viewsOptions} />
            </ChartCard>
            <ChartCard
              theme={theme}
              icon={IoVideocamOutline}
              title={t("admin.dashboard.charts.contentMix")}
            >
              <Doughnut data={statusDonut} options={donutOptions} />
            </ChartCard>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
