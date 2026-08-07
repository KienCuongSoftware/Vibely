import React, { useMemo, useState } from "react";

const WIDTH = 680;
const HEIGHT = 200;
const PAD_L = 8;
const PAD_R = 52;
const PAD_T = 16;
const PAD_B = 16;

function defaultFormat(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(v));
}

/** Định dạng tiền kiểu TikTok: $0.00, $0.30, $1.20 */
export function formatStudioMoney(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "$0.00";
  return `$${v.toFixed(2)}`;
}

function formatDayLabel(day) {
  const s = String(day ?? "");
  if (!s) return "";
  try {
    const d = new Date(`${s.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return s.slice(5);
    return d.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  } catch {
    return s.slice(5);
  }
}

/**
 * Biểu đồ đường có đường nét đứt dọc + tooltip khi hover (kiểu TikTok Studio).
 * @param {{
 *   points: Array<{ day: string, value: number }>,
 *   formatValue?: (n: number) => string,
 *   yMax?: number,
 *   emptyHint?: string | null,
 * }} props
 */
export function StudioTrendChart({
  points = [],
  formatValue = defaultFormat,
  yMax,
  emptyHint = "Chưa có dữ liệu trong khoảng này",
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const chart = useMemo(() => {
    const rows = Array.isArray(points) ? points : [];
    if (!rows.length) {
      return {
        path: "",
        area: "",
        coords: [],
        maxY: Math.max(Number(yMax) || 0, 1),
        gridTs: [0, 0.25, 0.5, 0.75, 1],
      };
    }
    const dataMax = Math.max(...rows.map((p) => Number(p.value ?? 0)), 0);
    const maxY = Math.max(
      dataMax,
      Number(yMax) || 0,
      dataMax > 0 ? dataMax : 1,
    );
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
    const gridTs = [0, 0.25, 0.5, 0.75, 1];
    return { path, area, coords, maxY, gridTs, innerH };
  }, [points, yMax]);

  const onMove = (e) => {
    const { coords } = chart;
    if (!coords.length) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
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
          className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-center shadow-lg"
          style={{ left: `${tipLeftPct}%`, top: 0 }}
        >
          <p className="text-[11px] text-zinc-400">{formatDayLabel(hover.day)}</p>
          <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-300">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-sky-400"
            />
            {formatValue(hover.value)}
          </p>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-48 w-full cursor-crosshair touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Biểu đồ xu hướng"
      >
        {chart.gridTs.map((t, i) => {
          const y = PAD_T + innerH * (1 - t);
          if (t === 0) {
            return (
              <line
                key={`g-${i}`}
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          }
          return (
            <g key={`g-${i}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={WIDTH - 4}
                y={y + 3}
                textAnchor="end"
                fill="#71717a"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatValue(chart.maxY * t)}
              </text>
            </g>
          );
        })}

        {chart.area ? (
          <path d={chart.area} fill="rgba(56,189,248,0.12)" />
        ) : null}
        {chart.path ? (
          <path
            d={chart.path}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
        ) : null}

        {chart.coords.map((c, i) => (
          <circle
            key={`pt-${i}`}
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 4.5 : 2.5}
            fill="#38bdf8"
            opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.35}
          />
        ))}

        {hover ? (
          <line
            x1={hover.x}
            y1={PAD_T}
            x2={hover.x}
            y2={HEIGHT - PAD_B}
            stroke="#a1a1aa"
            strokeWidth="1.25"
            strokeDasharray="4 3"
            opacity={0.95}
          />
        ) : null}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
        {chart.coords.map((pt, idx) => (
          <span
            key={`${pt.day}-${idx}`}
            className={
              hoverIdx === idx
                ? "font-medium text-zinc-300"
                : idx % 2 === 0
                  ? ""
                  : "opacity-0 sm:opacity-100"
            }
          >
            {String(pt.day).slice(5)}
          </span>
        ))}
      </div>

      {emptyHint &&
      (!chart.coords.length ||
        chart.coords.every((p) => p.value === 0)) ? (
        <p className="mt-2 text-center text-xs text-zinc-500">{emptyHint}</p>
      ) : null}
    </div>
  );
}
