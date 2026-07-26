export const OAUTH_ONBOARDING_KEY = "vibely_oauth_pending";
export const OAUTH_ONBOARDING_STEP_KEY = "vibely_oauth_onboarding_step";

export function isPendingUsername(username) {
  const normalized = String(username ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  return !normalized || normalized.startsWith("tmp.");
}

export function userNeedsOnboarding(user) {
  if (!user) return false;
  if (user.needsOnboarding === true) return true;
  return isPendingUsername(user.username);
}

export function buildOnboardingPendingFromUser(user) {
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    username: user.username,
  };
}

export function persistOnboardingPending(pending) {
  if (!pending) return;
  try {
    sessionStorage.setItem(OAUTH_ONBOARDING_KEY, JSON.stringify(pending));
  } catch {
    // ignore quota / private mode
  }
}

export function clearOnboardingSession() {
  try {
    sessionStorage.removeItem(OAUTH_ONBOARDING_KEY);
    sessionStorage.removeItem(OAUTH_ONBOARDING_STEP_KEY);
  } catch {
    // ignore
  }
}
