import { liveApi } from '@/features/live/api/liveApi.js'
import { liveMockService } from '@/features/live/mock/liveMockService.js'

export const LIVE_DATA_SOURCE = Object.freeze({ MOCK: 'mock', API: 'api' })

/**
 * `VITE_LIVE_DATA_SOURCE=api` switches every LIVE screen to the Spring Boot API.
 * Defaults to mock while the backend does not exist.
 */
export function resolveLiveDataSource(value = import.meta.env.VITE_LIVE_DATA_SOURCE) {
  return String(value ?? '').trim().toLowerCase() === LIVE_DATA_SOURCE.API
    ? LIVE_DATA_SOURCE.API
    : LIVE_DATA_SOURCE.MOCK
}

export const liveDataSource = resolveLiveDataSource()

/** Single entry point for LIVE data. UI and hooks import this, never the implementations. */
export const liveService = liveDataSource === LIVE_DATA_SOURCE.API ? liveApi : liveMockService
