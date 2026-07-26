/**
 * Guest users may only browse the For You feed. Any other action redirects to login.
 */
export function redirectGuestToLogin(navigate, token) {
  if (token) return false
  navigate('/login')
  return true
}
