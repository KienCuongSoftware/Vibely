import { LIVE_MEDIA } from '@/features/live/constants/liveConstants.js'

export const LIVE_CONNECTION_QUALITY = Object.freeze({
  EXCELLENT: 'excellent',
  GOOD: 'good',
  POOR: 'poor',
  RECONNECTING: 'reconnecting',
  /** No stats (HLS, not connected, or the browser does not expose them). */
  UNKNOWN: 'unknown',
})

/** Interval thresholds; loss is a ratio (0..1), RTT in ms. */
const POOR_LOSS = 0.08
const POOR_RTT_MS = 600
const GOOD_LOSS = 0.02
const GOOD_RTT_MS = 250

/**
 * @typedef {Object} LiveStatsTotals
 * @property {number} timestamp   ms
 * @property {number} bytes       bytes received (inbound) or sent (outbound)
 * @property {number} packets     packets received (inbound) or sent (outbound)
 * @property {number} packetsLost
 * @property {number|null} rttMs
 * @property {number|null} jitterMs
 *
 * @typedef {Object} LiveConnectionSample
 * @property {string} quality       one of LIVE_CONNECTION_QUALITY
 * @property {number|null} bitrateKbps
 * @property {number|null} lossPercent
 * @property {number|null} rttMs
 * @property {number|null} jitterMs
 */

const UNKNOWN_SAMPLE = Object.freeze({
  quality: LIVE_CONNECTION_QUALITY.UNKNOWN,
  bitrateKbps: null,
  lossPercent: null,
  rttMs: null,
  jitterMs: null,
})

const toMs = (seconds) => (typeof seconds === 'number' && Number.isFinite(seconds) ? seconds * 1000 : null)

/**
 * Cumulative counters from an RTCStatsReport. `inbound` = viewer (inbound-rtp), `outbound` =
 * host (outbound-rtp + the receiver's remote-inbound-rtp reports). RTT comes from the selected
 * ICE candidate pair, or from remote-inbound-rtp when the pair has none.
 *
 * @param {RTCStatsReport|Map<string, any>|null} report
 * @param {'inbound'|'outbound'} direction
 * @returns {LiveStatsTotals|null}
 */
export function readStatsTotals(report, direction) {
  if (!report || typeof report.forEach !== 'function') return null
  let found = false
  let timestamp = 0
  let bytes = 0
  let packets = 0
  let packetsLost = 0
  let jitterMs = null
  let remoteRttMs = null
  let selectedPairId = null
  const pairs = []

  report.forEach((stat) => {
    if (!stat || typeof stat !== 'object') return
    timestamp = Math.max(timestamp, Number(stat.timestamp) || 0)
    const kind = stat.kind ?? stat.mediaType
    if (direction === 'inbound' && stat.type === 'inbound-rtp') {
      found = true
      bytes += Number(stat.bytesReceived) || 0
      packets += Number(stat.packetsReceived) || 0
      packetsLost += Math.max(0, Number(stat.packetsLost) || 0)
      const jitter = toMs(stat.jitter)
      if (jitter != null && (kind === 'video' || jitterMs == null)) jitterMs = jitter
    } else if (direction === 'outbound' && stat.type === 'outbound-rtp') {
      found = true
      bytes += Number(stat.bytesSent) || 0
      packets += Number(stat.packetsSent) || 0
    } else if (direction === 'outbound' && stat.type === 'remote-inbound-rtp') {
      packetsLost += Math.max(0, Number(stat.packetsLost) || 0)
      const jitter = toMs(stat.jitter)
      if (jitter != null && (kind === 'video' || jitterMs == null)) jitterMs = jitter
      const rtt = toMs(stat.roundTripTime)
      if (rtt != null) remoteRttMs = Math.max(remoteRttMs ?? 0, rtt)
    } else if (stat.type === 'transport' && stat.selectedCandidatePairId) {
      selectedPairId = stat.selectedCandidatePairId
    } else if (stat.type === 'candidate-pair') {
      pairs.push(stat)
    }
  })
  if (!found) return null

  const pair = pairs.find((candidate) => candidate.id === selectedPairId)
    ?? pairs.find((candidate) => candidate.state === 'succeeded' && (candidate.nominated || candidate.selected))
  const pairRttMs = toMs(pair?.currentRoundTripTime)

  return {
    timestamp: timestamp || Date.now(),
    bytes,
    packets,
    packetsLost,
    rttMs: pairRttMs ?? remoteRttMs,
    jitterMs,
  }
}

/** @returns {string} one of LIVE_CONNECTION_QUALITY (never RECONNECTING; that comes from status) */
export function classifyConnectionQuality({ lossRatio = null, rttMs = null } = {}) {
  if (lossRatio == null && rttMs == null) return LIVE_CONNECTION_QUALITY.UNKNOWN
  if ((lossRatio ?? 0) > POOR_LOSS || (rttMs ?? 0) > POOR_RTT_MS) return LIVE_CONNECTION_QUALITY.POOR
  if ((lossRatio ?? 0) > GOOD_LOSS || (rttMs ?? 0) > GOOD_RTT_MS) return LIVE_CONNECTION_QUALITY.GOOD
  return LIVE_CONNECTION_QUALITY.EXCELLENT
}

/**
 * Interval sample between two cumulative readings (bitrate and loss need a delta).
 *
 * @param {LiveStatsTotals|null} current
 * @param {LiveStatsTotals|null} previous
 * @param {'inbound'|'outbound'} direction
 * @returns {LiveConnectionSample}
 */
export function computeConnectionSample(current, previous, direction) {
  if (!current) return UNKNOWN_SAMPLE
  let bitrateKbps = null
  let lossRatio = null
  if (previous && current.timestamp > previous.timestamp) {
    const elapsedMs = current.timestamp - previous.timestamp
    const bytes = current.bytes - previous.bytes
    if (bytes >= 0) bitrateKbps = Math.round((bytes * 8) / elapsedMs)
    const lost = Math.max(0, current.packetsLost - previous.packetsLost)
    const packets = Math.max(0, current.packets - previous.packets)
    const expected = direction === 'inbound' ? packets + lost : packets
    if (expected > 0) lossRatio = Math.min(1, lost / expected)
  }
  return {
    quality: classifyConnectionQuality({ lossRatio, rttMs: current.rttMs }),
    bitrateKbps,
    lossPercent: lossRatio == null ? null : Math.round(lossRatio * 1000) / 10,
    rttMs: current.rttMs == null ? null : Math.round(current.rttMs),
    jitterMs: current.jitterMs == null ? null : Math.round(current.jitterMs),
  }
}

/**
 * Polls `getStats` every `intervalMs` while started. Errors and missing stats yield UNKNOWN;
 * there is no retry logic beyond the next tick, and `stop()` clears everything.
 *
 * @param {Object} options
 * @param {() => Promise<RTCStatsReport|null>} options.getStats
 * @param {'inbound'|'outbound'} options.direction
 * @param {(sample: LiveConnectionSample) => void} options.onSample
 * @param {number} [options.intervalMs]
 */
export function createConnectionStatsSampler({ getStats, direction, onSample, intervalMs = LIVE_MEDIA.STATS_INTERVAL_MS }) {
  let timer = 0
  let previous = null
  let running = false
  let inFlight = false

  const tick = async () => {
    if (!running || inFlight) return
    inFlight = true
    try {
      const report = await getStats?.()
      if (!running) return
      const totals = readStatsTotals(report, direction)
      onSample(computeConnectionSample(totals, previous, direction))
      previous = totals
    } catch {
      if (running) onSample(UNKNOWN_SAMPLE)
      previous = null
    } finally {
      inFlight = false
    }
  }

  return {
    start() {
      if (running) return
      running = true
      previous = null
      void tick()
      timer = setInterval(() => void tick(), intervalMs)
    },
    stop() {
      running = false
      clearInterval(timer)
      timer = 0
      previous = null
    },
  }
}

export const UNKNOWN_CONNECTION_SAMPLE = UNKNOWN_SAMPLE
