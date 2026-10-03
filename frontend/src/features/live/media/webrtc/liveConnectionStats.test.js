import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyConnectionQuality,
  computeConnectionSample,
  createConnectionStatsSampler,
  LIVE_CONNECTION_QUALITY,
  readStatsTotals,
  UNKNOWN_CONNECTION_SAMPLE,
} from '@/features/live/media/webrtc/liveConnectionStats.js'

const report = (stats) => new Map(stats.map((stat) => [stat.id, stat]))

const inboundReport = ({ timestamp, bytes, packets, lost, rtt = 0.05, jitter = 0.01 }) => report([
  { id: 'v', type: 'inbound-rtp', kind: 'video', timestamp, bytesReceived: bytes, packetsReceived: packets, packetsLost: lost, jitter },
  { id: 't', type: 'transport', timestamp, selectedCandidatePairId: 'p1' },
  { id: 'p0', type: 'candidate-pair', timestamp, state: 'failed', currentRoundTripTime: 9 },
  { id: 'p1', type: 'candidate-pair', timestamp, state: 'succeeded', currentRoundTripTime: rtt },
])

describe('connection quality', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('classifies loss and round-trip time', () => {
    expect(classifyConnectionQuality({})).toBe(LIVE_CONNECTION_QUALITY.UNKNOWN)
    expect(classifyConnectionQuality({ lossRatio: 0, rttMs: 80 })).toBe(LIVE_CONNECTION_QUALITY.EXCELLENT)
    expect(classifyConnectionQuality({ lossRatio: 0.03, rttMs: 80 })).toBe(LIVE_CONNECTION_QUALITY.GOOD)
    expect(classifyConnectionQuality({ lossRatio: null, rttMs: 300 })).toBe(LIVE_CONNECTION_QUALITY.GOOD)
    expect(classifyConnectionQuality({ lossRatio: 0.1, rttMs: 80 })).toBe(LIVE_CONNECTION_QUALITY.POOR)
    expect(classifyConnectionQuality({ lossRatio: 0, rttMs: 700 })).toBe(LIVE_CONNECTION_QUALITY.POOR)
  })

  it('reads inbound totals and the RTT of the selected candidate pair', () => {
    const totals = readStatsTotals(inboundReport({ timestamp: 1000, bytes: 5000, packets: 90, lost: 10 }), 'inbound')
    expect(totals).toEqual({ timestamp: 1000, bytes: 5000, packets: 90, packetsLost: 10, rttMs: 50, jitterMs: 10 })
    expect(readStatsTotals(new Map(), 'inbound')).toBeNull()
    expect(readStatsTotals(null, 'inbound')).toBeNull()
  })

  it('reads outbound totals with loss and RTT from the receiver reports', () => {
    const totals = readStatsTotals(report([
      { id: 'o', type: 'outbound-rtp', kind: 'video', timestamp: 2000, bytesSent: 8000, packetsSent: 200 },
      { id: 'r', type: 'remote-inbound-rtp', kind: 'video', timestamp: 2000, packetsLost: 4, roundTripTime: 0.12, jitter: 0.004 },
    ]), 'outbound')
    expect(totals).toEqual({ timestamp: 2000, bytes: 8000, packets: 200, packetsLost: 4, rttMs: 120, jitterMs: 4 })
  })

  it('computes bitrate and interval loss between two readings', () => {
    const previous = readStatsTotals(inboundReport({ timestamp: 1000, bytes: 0, packets: 0, lost: 0 }), 'inbound')
    const current = readStatsTotals(inboundReport({ timestamp: 3000, bytes: 250000, packets: 90, lost: 10 }), 'inbound')
    expect(computeConnectionSample(current, previous, 'inbound')).toEqual({
      quality: LIVE_CONNECTION_QUALITY.POOR,
      bitrateKbps: 1000,
      lossPercent: 10,
      rttMs: 50,
      jitterMs: 10,
    })
    expect(computeConnectionSample(current, null, 'inbound')).toMatchObject({
      quality: LIVE_CONNECTION_QUALITY.EXCELLENT,
      bitrateKbps: null,
      lossPercent: null,
    })
    expect(computeConnectionSample(null, previous, 'inbound')).toEqual(UNKNOWN_CONNECTION_SAMPLE)
  })

  it('samples on an interval, reports errors as unknown and stops cleanly', async () => {
    vi.useFakeTimers()
    let call = 0
    const getStats = vi.fn(async () => {
      call += 1
      if (call === 3) throw new Error('closed')
      return inboundReport({ timestamp: call * 1000, bytes: call * 1000, packets: call * 100, lost: 0 })
    })
    const onSample = vi.fn()
    const sampler = createConnectionStatsSampler({ getStats, direction: 'inbound', onSample, intervalMs: 1000 })

    sampler.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(onSample).toHaveBeenLastCalledWith(expect.objectContaining({ quality: LIVE_CONNECTION_QUALITY.EXCELLENT, bitrateKbps: null }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(onSample).toHaveBeenLastCalledWith(expect.objectContaining({ bitrateKbps: 8, lossPercent: 0 }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(onSample).toHaveBeenLastCalledWith(UNKNOWN_CONNECTION_SAMPLE)

    sampler.stop()
    const calls = getStats.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(getStats).toHaveBeenCalledTimes(calls)
  })
})
