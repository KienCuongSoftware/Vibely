/** After login, send guests to Studio (TikTok-style redirect_url). */
export const STUDIO_HOME_RETURN_PATH = "/vibelystudio";
export const STUDIO_UPLOAD_RETURN_PATH = "/vibelystudio/upload?from=webapp&tab=video";
export const STUDIO_UPLOAD_PHOTO_RETURN_PATH = "/vibelystudio/upload?from=webapp&tab=photo";

function buildStudioLoginHref(returnPath) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    redirect_url: `${origin}${returnPath}`,
    enter_method: "redirect",
    enter_from: "vibelystudio",
  });
  return `/login?${params.toString()}`;
}

export function buildStudioHomeLoginHref() {
  return buildStudioLoginHref(STUDIO_HOME_RETURN_PATH);
}

export function buildStudioUploadLoginHref(tab = "video") {
  const path =
    tab === "photo" ? STUDIO_UPLOAD_PHOTO_RETURN_PATH : STUDIO_UPLOAD_RETURN_PATH;
  return buildStudioLoginHref(path);
}

export function hasLoginRedirectParam(search) {
  const raw = typeof search === "string" ? search : "";
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  return Boolean(params.get("redirect_url"));
}

export function resolveSafeLoginRedirect(searchParams) {
  const raw = String(searchParams?.get?.("redirect_url") ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://www.vibely.sbs");
    if (typeof window !== "undefined" && url.origin !== window.location.origin) {
      return null;
    }
    if (url.pathname === "/login" || url.pathname === "/signup") {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostLoginDestination(searchParams, role) {
  if (String(role ?? "").toUpperCase() === "ADMIN") return "/admin";
  return resolveSafeLoginRedirect(searchParams) || "/";
}
