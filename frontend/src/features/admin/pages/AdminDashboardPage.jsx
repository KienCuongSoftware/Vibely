import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { IoBarChartOutline, IoStatsChartOutline } from "react-icons/io5";
import { AdminLayout } from "@/features/admin/components/AdminLayout.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const TOTAL_COLOR = "#7b61ff";
const SEVERE_COLOR = "#ff6b6b";
const GRID_COLOR = "rgba(148, 163, 184, 0.18)";
const TICK_COLOR = "#94a3b8";

/** Demo series shaped like the reference dashboard (replace with API later). */
function buildDemoSeries(dayCount = 13) {
  const labels = [];
  const total = [];
  const severe = [];
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    labels.push(`${mm}-${dd}`);

    // Stable pseudo-random pattern for a polished demo chart
    const wave = Math.sin(i * 0.7) * 2.2 + Math.cos(i * 0.35) * 1.4;
    const t = Math.max(1, Math.round(6 + wave + (i % 3)));
    const s = Math.max(0, Math.round(t * (0.25 + (i % 4) * 0.05)));
    total.push(t);
    severe.push(Math.min(s, t));
  }

  return { labels, total, severe };
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: TICK_COLOR,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: false,
          padding: 18,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 17, 23, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.25)",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: GRID_COLOR,
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: { color: TICK_COLOR, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 12,
        grid: {
          color: GRID_COLOR,
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: {
          color: TICK_COLOR,
          stepSize: 3,
          precision: 0,
        },
      },
    },
  };
}

function ChartCard({ icon: Icon, title, children }) {
  return (
    <section className="flex min-h-[340px] flex-col rounded-2xl border border-zinc-700/70 bg-[#1e222d] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
        <Icon className="text-lg text-zinc-300" aria-hidden />
        <h2>{title}</h2>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [series] = useState(() => buildDemoSeries(13));

  useEffect(() => {
    document.title = t("admin.docTitle.dashboard");
  }, [t]);

  const options = useMemo(() => chartDefaults(), []);

  const barData = useMemo(
    () => ({
      labels: series.labels,
      datasets: [
        {
          label: t("admin.dashboard.totalSeries"),
          data: series.total,
          backgroundColor: TOTAL_COLOR,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.65,
        },
        {
          label: t("admin.dashboard.severeSeries"),
          data: series.severe,
          backgroundColor: SEVERE_COLOR,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.65,
        },
      ],
    }),
    [series, t],
  );

  const lineData = useMemo(
    () => ({
      labels: series.labels,
      datasets: [
        {
          label: t("admin.dashboard.totalSeries"),
          data: series.total,
          borderColor: TOTAL_COLOR,
          backgroundColor: TOTAL_COLOR,
          pointBackgroundColor: "#0f1117",
          pointBorderColor: TOTAL_COLOR,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          tension: 0.35,
        },
        {
          label: t("admin.dashboard.severeSeries"),
          data: series.severe,
          borderColor: SEVERE_COLOR,
          backgroundColor: SEVERE_COLOR,
          pointBackgroundColor: "#0f1117",
          pointBorderColor: SEVERE_COLOR,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          tension: 0.35,
        },
      ],
    }),
    [series, t],
  );

  const lineOptions = useMemo(
    () => ({
      ...options,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins.legend,
          labels: {
            ...options.plugins.legend.labels,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
      },
    }),
    [options],
  );

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    return {
      total: sum(series.total),
      severe: sum(series.severe),
      days: series.labels.length,
    };
  }, [series]);

  return (
    <AdminLayout
      active="dashboard"
      title={t("admin.dashboard.title")}
      subtitle={t("admin.dashboard.subtitle")}
    >
      <div className="space-y-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-700/70 bg-[#1e222d] px-4 py-3">
            <p className="text-xs text-zinc-400">{t("admin.dashboard.statTotal")}</p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">
              {totals.total}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700/70 bg-[#1e222d] px-4 py-3">
            <p className="text-xs text-zinc-400">{t("admin.dashboard.statSevere")}</p>
            <p className="mt-1 text-2xl font-bold text-[#ff6b6b] tabular-nums">
              {totals.severe}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700/70 bg-[#1e222d] px-4 py-3">
            <p className="text-xs text-zinc-400">{t("admin.dashboard.statDays")}</p>
            <p className="mt-1 text-2xl font-bold text-[#7b61ff] tabular-nums">
              {totals.days}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            icon={IoBarChartOutline}
            title={t("admin.dashboard.barTitle")}
          >
            <Bar data={barData} options={options} />
          </ChartCard>
          <ChartCard
            icon={IoStatsChartOutline}
            title={t("admin.dashboard.lineTitle")}
          >
            <Line data={lineData} options={lineOptions} />
          </ChartCard>
        </div>
      </div>
    </AdminLayout>
  );
}
