import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoPeopleOutline,
  IoPulseOutline,
  IoSparklesOutline,
  IoVideocamOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { adminApi } from "@/features/admin/api";
import {
  AdminGroupedBars,
  AdminShareBars,
  AdminTrendChart,
  formatAdminCompact,
} from "@/features/admin/components/AdminDashboardCharts.jsx";
import { AdminLayout } from "@/features/admin/components/AdminLayout.jsx";
import { useAuth } from "@/features/auth/hooks/useAuth.js";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";

const ACCENT = {
  users: "#7B61FF",
  usersFill: "rgba(123, 97, 255, 0.12)",
  videos: "#20D5EC",
  reports: "#FE2C55",
  views: "#20D5EC",
  viewsFill: "rgba(32, 213, 236, 0.12)",
  published: "#20D5EC",
  draft: "#A1A1AA",
  flagged: "#F59E0B",
  removed: "#FE2C55",
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

function emptyDashboard() {
  return {
    days: 14,
    totals: { users: 0, videos: 0, reports: 0, views: 0 },
    statusMix: { published: 0, draft: 0, flagged: 0, removed: 0 },
    series: [],
  };
}

function Panel({ isLight, title, icon: Icon, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border p-4 sm:p-5 ${
        isLight
          ? "border-zinc-200 bg-white"
          : "border-zinc-800 bg-zinc-950/60"
      } ${className}`}
    >
      {title ? (
        <div
          className={`mb-4 flex items-center gap-2 text-[15px] font-semibold ${
            isLight ? "text-[#161823]" : "text-white"
          }`}
        >
          {Icon ? (
            <Icon
              className={isLight ? "text-lg text-zinc-500" : "text-lg text-zinc-400"}
              aria-hidden
            />
          ) : null}
          <h2>{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { token, authReady } = useAuth();
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState("views");

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

  const insights = useMemo(
    () => (data.series.length ? buildAiInsights(data.series, t) : []),
    [data.series, t],
  );

  const metricTabs = useMemo(
    () => [
      {
        id: "users",
        label: t("admin.dashboard.kpi.users"),
        value: data.totals.users,
        icon: IoPeopleOutline,
        accent: ACCENT.users,
        seriesKey: "newUsers",
        color: ACCENT.users,
        fill: ACCENT.usersFill,
      },
      {
        id: "videos",
        label: t("admin.dashboard.kpi.videos"),
        value: data.totals.videos,
        icon: IoVideocamOutline,
        accent: ACCENT.videos,
        seriesKey: "newVideos",
        color: ACCENT.videos,
        fill: "rgba(32, 213, 236, 0.12)",
      },
      {
        id: "reports",
        label: t("admin.dashboard.kpi.reports"),
        value: data.totals.reports,
        icon: IoWarningOutline,
        accent: ACCENT.reports,
        seriesKey: "reports",
        color: ACCENT.reports,
        fill: "rgba(254, 44, 85, 0.12)",
      },
      {
        id: "views",
        label: t("admin.dashboard.kpi.views"),
        value: data.totals.views,
        icon: IoPulseOutline,
        accent: ACCENT.views,
        seriesKey: "views",
        color: ACCENT.views,
        fill: ACCENT.viewsFill,
      },
    ],
    [data.totals, t],
  );

  const activeTab = metricTabs.find((tab) => tab.id === metric) || metricTabs[3];

  const trendPoints = useMemo(
    () =>
      data.series.map((d) => ({
        day: d.day,
        value: Number(d[activeTab.seriesKey]) || 0,
      })),
    [data.series, activeTab.seriesKey],
  );

  const barPoints = useMemo(
    () =>
      data.series.map((d) => ({
        day: d.day,
        newVideos: Number(d.newVideos) || 0,
        reports: Number(d.reports) || 0,
      })),
    [data.series],
  );

  const statusTotal =
    data.statusMix.published +
    data.statusMix.draft +
    data.statusMix.flagged +
    data.statusMix.removed;

  const statusRows = useMemo(() => {
    const toPct = (n) =>
      statusTotal > 0 ? (Number(n) / statusTotal) * 100 : 0;
    return [
      {
        id: "published",
        label: t("admin.dashboard.status.published"),
        value: data.statusMix.published,
        percent: toPct(data.statusMix.published),
        color: ACCENT.published,
      },
      {
        id: "draft",
        label: t("admin.dashboard.status.draft"),
        value: data.statusMix.draft,
        percent: toPct(data.statusMix.draft),
        color: ACCENT.draft,
      },
      {
        id: "flagged",
        label: t("admin.dashboard.status.flagged"),
        value: data.statusMix.flagged,
        percent: toPct(data.statusMix.flagged),
        color: ACCENT.flagged,
      },
      {
        id: "removed",
        label: t("admin.dashboard.status.removed"),
        value: data.statusMix.removed,
        percent: toPct(data.statusMix.removed),
        color: ACCENT.removed,
      },
    ];
  }, [data.statusMix, statusTotal, t]);

  const toneClass = (tone) => {
    if (tone === "up") return "text-emerald-500";
    if (tone === "down") return "text-[#FE2C55]";
    return isLight ? "text-zinc-500" : "text-zinc-400";
  };

  const panelBorder = isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-950/60";
  const muted = isLight ? "text-zinc-500" : "text-zinc-400";
  const strong = isLight ? "text-[#161823]" : "text-zinc-100";
  const cellHover = isLight ? "hover:bg-zinc-50" : "hover:bg-zinc-900/40";
  const cellActive = isLight ? "bg-zinc-50" : "bg-zinc-900/70";
  const cellSplit = isLight ? "border-zinc-200" : "border-zinc-800/80";

  return (
    <AdminLayout
      active="dashboard"
      title={t("admin.dashboard.title")}
      subtitle={t("admin.dashboard.subtitle")}
    >
      {loading ? (
        <p className={muted}>{t("admin.loading")}</p>
      ) : error ? (
        <p className="text-[#FE2C55]">{error}</p>
      ) : (
        <div className="space-y-4 pb-6">
          {/* Key metrics + primary trend — Studio / Explore style */}
          <section className={`overflow-hidden rounded-xl border ${panelBorder}`}>
            <div
              className={`grid grid-cols-2 border-b sm:grid-cols-4 ${cellSplit}`}
            >
              {metricTabs.map((tab) => {
                const active = metric === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMetric(tab.id)}
                    className={`relative cursor-pointer px-3 py-3.5 text-left transition sm:px-4 ${
                      active ? cellActive : cellHover
                    }`}
                  >
                    {active ? (
                      <span
                        className="absolute inset-x-0 top-0 h-0.5"
                        style={{ backgroundColor: tab.accent }}
                      />
                    ) : null}
                    <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
                      <Icon className="text-sm" aria-hidden />
                      <span className="truncate">{tab.label}</span>
                    </p>
                    <p
                      className={`mt-1.5 text-2xl font-bold tabular-nums ${
                        active ? "" : strong
                      }`}
                      style={active ? { color: tab.accent } : undefined}
                    >
                      {formatAdminCompact(tab.value)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="p-4 pt-8 sm:p-5 sm:pt-10">
              <AdminTrendChart
                points={trendPoints}
                color={activeTab.color}
                fill={activeTab.fill}
                isLight={isLight}
                emptyHint={t("admin.dashboard.ai.empty")}
              />
            </div>
          </section>

          {/* AI insights */}
          <Panel isLight={isLight}>
            <div
              className={`mb-3 flex items-center gap-2 text-[15px] font-semibold ${strong}`}
            >
              <IoSparklesOutline className="text-lg text-[#FE2C55]" aria-hidden />
              <h2>{t("admin.dashboard.ai.title")}</h2>
            </div>
            <p className={`mb-3 text-[13px] ${muted}`}>
              {t("admin.dashboard.ai.intro")}
            </p>
            {insights.length ? (
              <ul className="space-y-2">
                {insights.map((item) => (
                  <li
                    key={item.id}
                    className={`flex gap-2.5 text-[13px] leading-relaxed ${
                      isLight ? "text-zinc-700" : "text-zinc-200"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneClass(item.tone)}`}
                      style={{ backgroundColor: "currentColor" }}
                      aria-hidden
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={muted}>{t("admin.dashboard.ai.empty")}</p>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              isLight={isLight}
              title={t("admin.dashboard.charts.videosReports")}
            >
              <AdminGroupedBars
                points={barPoints}
                seriesA={{
                  key: "newVideos",
                  color: ACCENT.videos,
                  label: t("admin.dashboard.series.newVideos"),
                }}
                seriesB={{
                  key: "reports",
                  color: ACCENT.reports,
                  label: t("admin.dashboard.series.reports"),
                }}
                isLight={isLight}
              />
            </Panel>

            <Panel
              isLight={isLight}
              title={t("admin.dashboard.charts.contentMix")}
            >
              <AdminShareBars rows={statusRows} isLight={isLight} />
              {statusTotal === 0 ? (
                <p className={`mt-4 text-center text-xs ${muted}`}>
                  {t("admin.dashboard.ai.empty")}
                </p>
              ) : null}
            </Panel>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
