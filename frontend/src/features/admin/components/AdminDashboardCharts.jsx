import React, { useMemo, useState } from "react";

const WIDTH = 720;
const HEIGHT = 220;
const PAD_L = 8;
const PAD_R = 48;
const PAD_T = 18;
const PAD_B = 14;

function niceCeil(value) {
  const v = Math.max(Number(value) || 0, 0);
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const mag = 10 ** exp;
  const n = v / mag;
  let nice;
  if (n <= 1) nice = 1;
  else if (n <= 2) nice = 2;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

function buildAxisTicks(dataMax) {
  if (dataMax <= 0) {
    return [{ ratio: 1, value: 1 }];
  }
  const maxY = niceCeil(dataMax);
  const step = niceCeil(maxY / 4);
  const ticks = [];
  for (let value = step; value <= maxY + 1e-9; value += step) {
    ticks.push({ ratio: value / maxY, value });
  }
  if (!ticks.length) ticks.push({ ratio: 1, value: maxY });
  return ticks;
}

function formatDayLabel(day) {
  const s = String(day ?? "");
  const m = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : s.slice(5);
}

export function formatAdminCompact(n) {
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

/**
 * TikTok Studio–style area/line chart (light or dark).
 * @param {{
 *   points: Array<{ day: string, value: number }>,
 *   color?: string,
 *   fill?: string,
 *   isLight?: boolean,
 *   formatValue?: (n: number) => string,
 *   emptyHint?: string | null,
 * }} props
 */
export function AdminTrendChart({
  points = [],
  color = "#20D5EC",
  fill = "rgba(32, 213, 236, 0.12)",
  isLight = true,
  formatValue = formatAdminCompact,
  emptyHint = null,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const grid = isLight ? "#e4e4e7" : "#3f3f46";
  const tickFill = isLight ? "#71717a" : "#71717a";
  const tipBg = isLight
    ? "border-zinc-200 bg-white text-[#161823]"
    : "border-zinc-700 bg-zinc-900 text-zinc-100";
  const tipMuted = isLight ? "text-zinc-500" : "text-zinc-400";
  const dayMuted = isLight ? "text-zinc-500" : "text-zinc-500";
  const dayActive = isLight ? "text-[#161823]" : "text-zinc-300";

  const chart = useMemo(() => {
    const rows = Array.isArray(points) ? points : [];
    const dataMax = rows.length
      ? Math.max(...rows.map((p) => Number(p.value ?? 0)), 0)
      : 0;
    const ticks = buildAxisTicks(dataMax);
    const maxY = dataMax <= 0 ? 1 : niceCeil(dataMax);

    if (!rows.length) {
      return { path: "", area: "", coords: [], maxY, ticks };
    }

    const innerW = WIDTH - PAD_L - PAD_R;
    const innerH = HEIGHT - PAD_T - PAD_B;
    const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0;
    const coords = rows.map((p, idx) => {
      const x = PAD_L + idx * stepX;
      const y = PAD_T + innerH - (Number(p.value ?? 0) / maxY) * innerH;
      return { x, y, day: p.day, value: Number(p.value ?? 0) };
    });
    const path = coords
      .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x} ${c.y}`)
      .join(" ");
    const area = `${path} L ${coords[coords.length - 1].x} ${PAD_T + innerH} L ${coords[0].x} ${PAD_T + innerH} Z`;
    return { path, area, coords, maxY, ticks };
  }, [points]);

  const onMove = (e) => {
    const { coords } = chart;
    if (!coords.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i += 1) {
      const d = Math.abs(coords[i].x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHoverIdx(best);
  };

  const hover = hoverIdx != null ? chart.coords[hoverIdx] : null;
  const tipLeftPct = hover ? (hover.x / WIDTH) * 100 : 0;
  const innerH = HEIGHT - PAD_T - PAD_B;

  return (
    <div className="relative">
      {hover ? (
        <div
          className={`pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-center shadow-lg ${tipBg}`}
          style={{ left: `${tipLeftPct}%`, top: 0 }}
        >
          <p className={`text-[11px] ${tipMuted}`}>
            {formatDayLabel(hover.day)}
          </p>
          <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {formatValue(hover.value)}
          </p>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-48 w-full cursor-crosshair touch-none sm:h-52"
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
      >
        <line
          x1={PAD_L}
          y1={PAD_T + innerH}
          x2={WIDTH - PAD_R}
          y2={PAD_T + innerH}
          stroke={grid}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {chart.ticks.map((tick, i) => {
          const y = PAD_T + innerH * (1 - tick.ratio);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke={grid}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={WIDTH - 4}
                y={y + 3}
                textAnchor="end"
                fill={tickFill}
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatValue(tick.value)}
              </text>
            </g>
          );
        })}

        {chart.area ? <path d={chart.area} fill={fill} /> : null}
        {chart.path ? (
          <path
            d={chart.path}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {chart.coords.map((c, i) => (
          <circle
            key={`pt-${i}`}
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 4.5 : 0}
            fill={color}
          />
        ))}

        {hover ? (
          <line
            x1={hover.x}
            y1={PAD_T}
            x2={hover.x}
            y2={HEIGHT - PAD_B}
            stroke={isLight ? "#a1a1aa" : "#a1a1aa"}
            strokeWidth="1.25"
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>

      <div
        className={`mt-1 flex items-center justify-between text-[11px] ${dayMuted}`}
      >
        {chart.coords.map((pt, idx) => (
          <span
            key={`${pt.day}-${idx}`}
            className={
              hoverIdx === idx
                ? `font-medium ${dayActive}`
                : idx % 2 === 0
                  ? ""
                  : "opacity-0 sm:opacity-100"
            }
          >
            {formatDayLabel(pt.day)}
          </span>
        ))}
      </div>

      {emptyHint &&
      (!chart.coords.length ||
        chart.coords.every((p) => p.value === 0)) ? (
        <p
          className={`mt-2 text-center text-xs ${isLight ? "text-zinc-500" : "text-zinc-500"}`}
        >
          {emptyHint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Grouped daily bars (videos + reports).
 */
export function AdminGroupedBars({
  points = [],
  seriesA = { key: "a", color: "#20D5EC", label: "" },
  seriesB = { key: "b", color: "#FE2C55", label: "" },
  isLight = true,
  formatValue = formatAdminCompact,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const rows = Array.isArray(points) ? points : [];
  const dataMax = rows.length
    ? Math.max(
        ...rows.flatMap((p) => [
          Number(p[seriesA.key] ?? 0),
          Number(p[seriesB.key] ?? 0),
        ]),
        0,
      )
    : 0;
  const maxY = dataMax <= 0 ? 1 : niceCeil(dataMax);
  const ticks = buildAxisTicks(dataMax);
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;
  const groupW = rows.length ? innerW / rows.length : 0;
  const barW = Math.max(3, Math.min(10, groupW * 0.28));

  const grid = isLight ? "#e4e4e7" : "#3f3f46";
  const tickFill = "#71717a";
  const tipBg = isLight
    ? "border-zinc-200 bg-white text-[#161823]"
    : "border-zinc-700 bg-zinc-900 text-zinc-100";
  const tipMuted = isLight ? "text-zinc-500" : "text-zinc-400";
  const dayMuted = isLight ? "text-zinc-500" : "text-zinc-500";

  const hover = hoverIdx != null ? rows[hoverIdx] : null;
  const tipLeftPct =
    hoverIdx != null && rows.length
      ? ((PAD_L + hoverIdx * groupW + groupW / 2) / WIDTH) * 100
      : 0;

  return (
    <div className="relative">
      {hover ? (
        <div
          className={`pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 shadow-lg ${tipBg}`}
          style={{ left: `${tipLeftPct}%`, top: 0 }}
        >
          <p className={`mb-1 text-[11px] ${tipMuted}`}>
            {formatDayLabel(hover.day)}
          </p>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: seriesA.color }}
            />
            {seriesA.label}: {formatValue(hover[seriesA.key])}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: seriesB.color }}
            />
            {seriesB.label}: {formatValue(hover[seriesB.key])}
          </p>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-48 w-full cursor-crosshair touch-none sm:h-52"
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
      >
        <line
          x1={PAD_L}
          y1={PAD_T + innerH}
          x2={WIDTH - PAD_R}
          y2={PAD_T + innerH}
          stroke={grid}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {ticks.map((tick, i) => {
          const y = PAD_T + innerH * (1 - tick.ratio);
          return (
            <g key={`bt-${i}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke={grid}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={WIDTH - 4}
                y={y + 3}
                textAnchor="end"
                fill={tickFill}
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatValue(tick.value)}
              </text>
            </g>
          );
        })}

        {rows.map((row, idx) => {
          const cx = PAD_L + idx * groupW + groupW / 2;
          const a = Number(row[seriesA.key] ?? 0);
          const b = Number(row[seriesB.key] ?? 0);
          const hA = (a / maxY) * innerH;
          const hB = (b / maxY) * innerH;
          const dim = hoverIdx != null && hoverIdx !== idx;
          return (
            <g
              key={`bar-${idx}`}
              opacity={dim ? 0.35 : 1}
              onPointerEnter={() => setHoverIdx(idx)}
            >
              <rect
                x={cx - barW - 1.5}
                y={PAD_T + innerH - hA}
                width={barW}
                height={Math.max(hA, a > 0 ? 2 : 0)}
                rx={2}
                fill={seriesA.color}
              />
              <rect
                x={cx + 1.5}
                y={PAD_T + innerH - hB}
                width={barW}
                height={Math.max(hB, b > 0 ? 2 : 0)}
                rx={2}
                fill={seriesB.color}
              />
              <rect
                x={PAD_L + idx * groupW}
                y={PAD_T}
                width={groupW}
                height={innerH}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      <div className={`mt-1 flex items-center justify-between text-[11px] ${dayMuted}`}>
        {rows.map((pt, idx) => (
          <span
            key={`${pt.day}-${idx}`}
            className={idx % 2 === 0 ? "" : "opacity-0 sm:opacity-100"}
          >
            {formatDayLabel(pt.day)}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-zinc-600">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: seriesA.color }}
          />
          {seriesA.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-zinc-600">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: seriesB.color }}
          />
          {seriesB.label}
        </span>
      </div>
    </div>
  );
}

/**
 * Horizontal share bars — clearer than a flat donut when one status dominates.
 */
export function AdminShareBars({ rows = [], isLight = true }) {
  const track = isLight ? "bg-zinc-100" : "bg-zinc-800/80";
  const label = isLight ? "text-[#161823]" : "text-zinc-300";
  const pctText = isLight ? "text-zinc-500" : "text-zinc-400";

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const pct = Math.min(100, Math.max(0, Number(row.percent) || 0));
        return (
          <li key={row.id}>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className={`min-w-0 truncate font-medium ${label}`}>
                {row.label}
              </span>
              <span className={`shrink-0 tabular-nums ${pctText}`}>
                {pct.toFixed(1)}%
                <span className="ml-2 text-[11px] opacity-70">
                  {formatAdminCompact(row.value)}
                </span>
              </span>
            </div>
            <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${track}`}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
