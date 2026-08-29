export function formatLiveViewerCount(value) {
  const count = Number(value ?? 0)
  if (!Number.isFinite(count) || count <= 0) return '0'
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  }
  return String(count)
}
