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

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/** jsdom không có canvas renderer; mock context để tránh noise trong test output. */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
  }))
}

/** jsdom không implement play(); tránh stderr khi feed gọi autoplay trong test */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
}
