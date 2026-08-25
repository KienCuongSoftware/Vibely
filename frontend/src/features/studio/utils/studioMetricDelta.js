/** So sánh kỳ hiện tại với kỳ liền trước (cùng số ngày). */
export function deltaOf(current, previous) {
  const curr = Number(current ?? 0)
  if (!Number.isFinite(curr)) {
    return { diff: 0, percent: 0 }
  }
  if (previous == null || !Number.isFinite(Number(previous))) {
    return { diff: 0, percent: curr === 0 ? 0 : null }
  }
  const prev = Math.max(0, Number(previous))
  const diff = curr - prev
  if (prev > 0) {
    return { diff, percent: (diff / prev) * 100 }
  }
  if (curr === 0) {
    return { diff: 0, percent: 0 }
  }
  return { diff, percent: 100 }
}

export function previousPeriodTotal(longerWindowTotal, currentTotal) {
  return Math.max(0, Number(longerWindowTotal ?? 0) - Number(currentTotal ?? 0))
}

function formatDeltaCount(n) {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v)) return '0'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(abs))
}

/**
 * TikTok Studio: `0 (--)` khi cả hai kỳ = 0; `+3 (60.0%)` khi so được kỳ trước;
 * tăng từ 0 thì `+n (100.0%)`. Rewards luôn hiện phần trăm: `$0.00 (0.0%)`.
 */
export function formatMetricDeltaLabel(current, previous, { money = false } = {}) {
  const curr = Number(current ?? 0)
  const d = deltaOf(curr, previous)
  const tone = d.diff > 0 ? 'up' : d.diff < 0 ? 'down' : 'neutral'

  if (money) {
    const pct = Math.abs(Number.isFinite(d.percent) ? d.percent : 0).toFixed(1)
    if (d.diff === 0) {
      return { text: `$0.00 (${pct}%)`, tone: 'neutral' }
    }
    const sign = d.diff > 0 ? '+' : '-'
    return { text: `${sign}$${Math.abs(d.diff).toFixed(2)} (${pct}%)`, tone }
  }

  const prev = previous == null ? 0 : Number(previous)
  if (curr === 0 && (!Number.isFinite(prev) || prev === 0)) {
    return { text: '0 (--)', tone: 'neutral' }
  }

  const signed =
    d.diff > 0 ? `+${formatDeltaCount(d.diff)}` : d.diff < 0 ? `-${formatDeltaCount(d.diff)}` : '0'
  const pctText = d.percent == null ? '--' : `${Math.abs(d.percent).toFixed(1)}%`
  return { text: `${signed} (${pctText})`, tone }
}
