export class BehaviorTracker {
  constructor({ maxSamples = 120 } = {}) {
    this.maxSamples = maxSamples;
    this.samples = [];
    this.active = false;
  }

  start() {
    this.samples = [];
    this.active = true;
  }

  stop() {
    this.active = false;
  }

  attach(target = window) {
    this._onMove = (event) => {
      if (!this.active) return;
      const point = normalizePoint(event, target);
      if (!point) return;
      this.push({
        timestampMs: Date.now(),
        x: point.x,
        y: point.y,
        eventType: event.type,
      });
    };
    target.addEventListener("pointermove", this._onMove, { passive: true });
    target.addEventListener("touchmove", this._onMove, { passive: true });
  }

  detach(target = window) {
    if (!this._onMove) return;
    target.removeEventListener("pointermove", this._onMove);
    target.removeEventListener("touchmove", this._onMove);
  }

  push(sample) {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  drain() {
    const out = [...this.samples];
    this.samples = [];
    return out;
  }
}

function normalizePoint(event, target) {
  if (event.touches?.length) {
    const rect = target.getBoundingClientRect?.() || { left: 0, top: 0 };
    const touch = event.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }
  if (typeof event.offsetX === "number") {
    return { x: event.offsetX, y: event.offsetY };
  }
  return { x: event.clientX, y: event.clientY };
}
