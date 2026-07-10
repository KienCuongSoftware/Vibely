/** True while the browser is on /login handling an OAuth or reactivation redirect. */
export function isPendingOAuthBrowserCallback() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const oauth = params.get("oauth");
  if (oauth === "success" && params.get("code")) return true;
  if (oauth === "error") return true;
  if (params.get("reactivate") === "1" && params.get("token")) return true;
  if (params.get("banned") === "1") return true;
  return false;
}
