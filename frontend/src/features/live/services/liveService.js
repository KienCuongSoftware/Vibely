import { liveApi } from '@/features/live/api/liveApi.js'
import { liveMockService } from '@/features/live/mock/liveMockService.js'

export const LIVE_DATA_SOURCE = Object.freeze({ MOCK: 'mock', API: 'api' })

/**
 * Every LIVE screen talks to the Spring Boot API by default.
 * `VITE_LIVE_DATA_SOURCE=mock` switches to in-memory mock data (UI work without a backend, tests).
 */
export function resolveLiveDataSource(value = import.meta.env.VITE_LIVE_DATA_SOURCE) {
  return String(value ?? '').trim().toLowerCase() === LIVE_DATA_SOURCE.MOCK
    ? LIVE_DATA_SOURCE.MOCK
    : LIVE_DATA_SOURCE.API
}

export const liveDataSource = resolveLiveDataSource()

/** Single entry point for LIVE data. UI and hooks import this, never the implementations. */
export const liveService = liveDataSource === LIVE_DATA_SOURCE.API ? liveApi : liveMockService
