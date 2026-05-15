import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

/** jsdom: VirtualizedFeed uses IntersectionObserver for active slide */
globalThis.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  observe(el) {
    queueMicrotask(() => {
      this.callback([
        {
          target: el,
          intersectionRatio: 1,
          isIntersecting: true,
        },
      ])
    })
  }
  unobserve() {}
  disconnect() {}
}

/** jsdom không implement play(); tránh stderr khi feed gọi autoplay trong test */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
}
