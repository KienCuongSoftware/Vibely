export const POPOVER_WIDTH = 280
export const POPOVER_ESTIMATED_HEIGHT = 128

export function clampPopoverPosition(anchorRect, popoverWidth, popoverHeight) {
  const gap = 10
  const margin = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = anchorRect.left - popoverWidth - gap
  if (left < margin) {
    left = anchorRect.right + gap
  }
  left = Math.max(margin, Math.min(left, vw - popoverWidth - margin))

  let top = anchorRect.top - 8
  top = Math.max(margin, Math.min(top, vh - popoverHeight - margin))
  return { top, left }
}
