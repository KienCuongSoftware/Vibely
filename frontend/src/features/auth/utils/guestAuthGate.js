/**
 * Guest users may only browse the For You feed. Any other action opens login.
 */
let openGuestLoginImpl = null

export function registerGuestLoginOpener(fn) {
  openGuestLoginImpl = fn
}

export function redirectGuestToLogin(navigate, token) {
  if (token) return false
  if (typeof openGuestLoginImpl === 'function') {
    openGuestLoginImpl()
    return true
  }
  navigate('/login')
  return true
}
