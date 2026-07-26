/** True when the event target is a field where Space/Enter should stay local. */
export function isEditableKeyboardTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

export function shouldHandleGlobalShortcut(event) {
  if (event.defaultPrevented || event.isComposing) return false
  if (isEditableKeyboardTarget(event.target)) return false
  return true
}

export function isSpaceKey(event) {
  return event.key === ' ' || event.code === 'Space'
}

export function isEnterKey(event) {
  return event.key === 'Enter'
}
