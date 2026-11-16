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
import { AdminLayout } from "@/features/admin/components/AdminLayout.jsx";
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

/** Demo analytics for admin dashboard (swap for API later). */
function buildDashboardData(dayCount = 14) {
  const labels = [];
  const newUsers = [];
  const newVideos = [];
  const reports = [];
  const views = [];
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  let userBase = 12_400;
  let videoBase = 48_200;

  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    labels.push(`${mm}-${dd}`);

    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1.35 : 1;
    const users = Math.max(
      18,
      Math.round((42 + Math.sin(i * 0.55) * 14 + (i % 5) * 3) * weekend),
    );
    const videos = Math.max(
      30,
      Math.round((68 + Math.cos(i * 0.4) * 22 + (i % 4) * 5) * weekend),
    );
    const reps = Math.max(
      2,
      Math.round(videos * (0.08 + (i % 3) * 0.02) + Math.sin(i) * 2),
    );
    const viewK = Math.max(
      120,
      Math.round((380 + Math.sin(i * 0.35) * 90 + i * 8) * weekend),
    );

    newUsers.push(users);
    newVideos.push(videos);
    reports.push(reps);
    views.push(viewK);
    userBase += users;
    videoBase += videos;
  }

  const cumUsers = [];
  const cumVideos = [];
  let u = userBase - newUsers.reduce((a, b) => a + b, 0);
  let v = videoBase - newVideos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < dayCount; i += 1) {
    u += newUsers[i];
    v += newVideos[i];
    cumUsers.push(u);
    cumVideos.push(v);
  }

  const statusDist = {
    published: 72,
    draft: 11,
    flagged: 9,
    removed: 8,
  };

  return {
    labels,
    newUsers,
    newVideos,
    reports,
    views,
    cumUsers,
    cumVideos,
    statusDist,
    totals: {
      users: cumUsers[cumUsers.length - 1],
      videos: cumVideos[cumVideos.length - 1],
      reports: reports.reduce((a, b) => a + b, 0),
      views: views.reduce((a, b) => a + b, 0),
    },
  };
}

function pctChange(arr) {
  if (!arr?.length || arr.length < 4) return 0;
  const mid = Math.floor(arr.length / 2);
  const first = arr.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const second = arr.slice(mid).reduce((a, b) => a + b, 0) / (arr.length - mid);
  if (!first) return 0;
  return ((second - first) / first) * 100;
}

function buildAiInsights(data, t) {
  const userPct = pctChange(data.newUsers);
  const videoPct = pctChange(data.newVideos);
  const reportPct = pctChange(data.reports);
  const viewPct = pctChange(data.views);
  const peakVideoIdx = data.newVideos.indexOf(Math.max(...data.newVideos));
  const peakReportIdx = data.reports.indexOf(Math.max(...data.reports));
  const reportRatio =
    data.totals.videos > 0
      ? (data.totals.reports / data.newVideos.reduce((a, b) => a + b, 0)) * 100
      : 0;

  const tone = (pct) =>
    pct >= 8 ? "up" : pct <= -8 ? "down" : "flat";

  return [
    {
      id: "users",
      tone: tone(userPct),
      text: t("admin.dashboard.ai.usersTrend", {
        pct: Math.abs(userPct).toFixed(1),
        dir:
          userPct >= 0
            ? t("admin.dashboard.ai.up")
            : t("admin.dashboard.ai.down"),
      }),
    },
    {
      id: "videos",
      tone: tone(videoPct),
      text: t("admin.dashboard.ai.videosTrend", {
        pct: Math.abs(videoPct).toFixed(1),
        dir:
          videoPct >= 0
            ? t("admin.dashboard.ai.up")
            : t("admin.dashboard.ai.down"),
        peak: data.labels[peakVideoIdx],
      }),
    },
    {
      id: "moderation",
      tone: tone(reportPct),
      text: t("admin.dashboard.ai.moderationTrend", {
        pct: Math.abs(reportPct).toFixed(1),
        dir:
          reportPct >= 0
            ? t("admin.dashboard.ai.up")
            : t("admin.dashboard.ai.down"),
        ratio: reportRatio.toFixed(1),
        peak: data.labels[peakReportIdx],
      }),
    },
    {
      id: "views",
      tone: tone(viewPct),
      text: t("admin.dashboard.ai.viewsTrend", {
        pct: Math.abs(viewPct).toFixed(1),
        dir:
          viewPct >= 0
            ? t("admin.dashboard.ai.up")
            : t("admin.dashboard.ai.down"),
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
    tooltipBorder: isLight
      ? "rgba(0,0,0,0.08)"
      : "rgba(148, 163, 184, 0.25)",
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

function baseOptions(theme, { suggestedMax, stacked = false } = {}) {
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
        stacked,
        grid: {
          color: theme.grid,
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: {
          color: theme.tick,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        stacked,
        beginAtZero: true,
        suggestedMax,
        grid: {
          color: theme.grid,
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: { color: theme.tick, precision: 0 },
      },
    },
  };
}

function ChartCard({ theme, icon: Icon, title, children, className = "" }) {
  return (
    <section className={`${theme.card} flex min-h-[320px] flex-col ${className}`}>
      <div className={theme.cardTitle}>
        <Icon className={theme.cardIcon} aria-hidden />
        <h2>{title}</h2>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

function formatCompact(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return String(v);
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const theme = useMemo(() => chartTheme(isLight), [isLight]);
  const [data] = useState(() => buildDashboardData(14));

  useEffect(() => {
    document.title = t("admin.docTitle.dashboard");
  }, [t]);

  const insights = useMemo(() => buildAiInsights(data, t), [data, t]);

  const usersLine = useMemo(
    () => ({
      labels: data.labels,
      datasets: [
        {
          label: t("admin.dashboard.series.totalUsers"),
          data: data.cumUsers,
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
          data: data.newUsers,
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
    [data, t, theme.pointFill],
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
      labels: data.labels,
      datasets: [
        {
          label: t("admin.dashboard.series.newVideos"),
          data: data.newVideos,
          backgroundColor: COLORS.videos,
          borderRadius: 4,
          barPercentage: 0.75,
        },
        {
          label: t("admin.dashboard.series.reports"),
          data: data.reports,
          backgroundColor: COLORS.reports,
          borderRadius: 4,
          barPercentage: 0.75,
        },
      ],
    }),
    [data, t],
  );

  const videosOptions = useMemo(
    () => baseOptions(theme, { suggestedMax: Math.max(...data.newVideos) + 10 }),
    [theme, data.newVideos],
  );

  const viewsLine = useMemo(
    () => ({
      labels: data.labels,
      datasets: [
        {
          label: t("admin.dashboard.series.views"),
          data: data.views,
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
    [data, t, theme.pointFill],
  );

  const viewsOptions = useMemo(() => {
    const base = baseOptions(theme, {
      suggestedMax: Math.max(...data.views) + 40,
    });
    return {
      ...base,
      plugins: {
        ...base.plugins,
        legend: { display: false },
      },
    };
  }, [theme, data.views]);

  const statusDonut = useMemo(
    () => ({
      labels: [
        t("admin.dashboard.status.published"),
        t("admin.dashboard.status.draft"),
        t("admin.dashboard.status.flagged"),
        t("admin.dashboard.status.removed"),
      ],
      datasets: [
        {
          data: [
            data.statusDist.published,
            data.statusDist.draft,
            data.statusDist.flagged,
            data.statusDist.removed,
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
    }),
    [data.statusDist, t],
  );

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
            label: (ctx) =>
              ` ${ctx.label}: ${ctx.parsed}%`,
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
      <div className="space-y-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={theme.kpi}>
            <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
              <IoPeopleOutline aria-hidden />
              {t("admin.dashboard.kpi.users")}
            </p>
            <p className={theme.kpiValue}>{formatCompact(data.totals.users)}</p>
          </div>
          <div className={theme.kpi}>
            <p className={`${theme.kpiLabel} flex items-center gap-1.5`}>
              <IoVideocamOutline aria-hidden />
              {t("admin.dashboard.kpi.videos")}
            </p>
            <p className={theme.kpiValue}>{formatCompact(data.totals.videos)}</p>
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
              {formatCompact(data.totals.views * 1000)}
            </p>
          </div>
        </div>

        <section className={theme.insight}>
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
            <IoSparklesOutline
              className="text-lg text-[#fe2c55]"
              aria-hidden
            />
            <h2>{t("admin.dashboard.ai.title")}</h2>
          </div>
          <p
            className={`mb-3 text-[13px] ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
          >
            {t("admin.dashboard.ai.intro")}
          </p>
          <ul className="space-y-2.5">
            {insights.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${
                  isLight ? "bg-zinc-50 text-zinc-700" : "bg-zinc-900/60 text-zinc-200"
                }`}
              >
                <span className={`mr-2 font-semibold ${toneClass(item.tone)}`}>
                  ●
                </span>
                {item.text}
              </li>
            ))}
          </ul>
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
    </AdminLayout>
  );
}
