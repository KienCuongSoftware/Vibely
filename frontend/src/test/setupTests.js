import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/** jsdom không implement play(); tránh stderr khi feed gọi autoplay trong test */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
}
