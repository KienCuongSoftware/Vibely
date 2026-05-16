/**
 * Limits concurrent media URL assignments (prevents many simultaneous decodes on mobile).
 */
export class FeedPrefetchManager {
  constructor({ maxConcurrent = 2 } = {}) {
    this.maxConcurrent = maxConcurrent
    this.active = 0
    this.queue = []
  }

  acquireSlot() {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (this.active < this.maxConcurrent) {
          this.active += 1
          resolve(() => {
            this.active -= 1
            const next = this.queue.shift()
            if (next) next()
          })
        } else {
          this.queue.push(() => {
            this.active += 1
            resolve(() => {
              this.active -= 1
              const n = this.queue.shift()
              if (n) n()
            })
          })
        }
      }
      tryRun()
    })
  }
}
