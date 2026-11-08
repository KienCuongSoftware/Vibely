const STORAGE_KEY = "vibely.recentLocations.v1";
const MAX_RECENT = 8;

export function loadRecentLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.name === "string" && item.name.trim())
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberLocation(place) {
  if (!place?.name?.trim()) return;
  const next = {
    placeId: place.placeId ?? null,
    name: String(place.name).trim(),
    address: place.address ? String(place.address).trim() : "",
    lat: typeof place.lat === "number" ? place.lat : null,
    lng: typeof place.lng === "number" ? place.lng : null,
  };
  const prev = loadRecentLocations().filter((item) => {
    if (next.placeId && item.placeId) return item.placeId !== next.placeId;
    return item.name !== next.name;
  });
  const merged = [next, ...prev].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore quota
  }
}

export function toLocationPayload(place) {
  if (!place?.name?.trim()) {
    return {
      locationName: null,
      locationAddress: null,
      locationLat: null,
      locationLng: null,
      locationPlaceId: null,
    };
  }
  return {
    locationName: String(place.name).trim().slice(0, 180),
    locationAddress: place.address
      ? String(place.address).trim().slice(0, 400)
      : null,
    locationLat: typeof place.lat === "number" ? place.lat : null,
    locationLng: typeof place.lng === "number" ? place.lng : null,
    locationPlaceId: place.placeId
      ? String(place.placeId).trim().slice(0, 64)
      : null,
  };
}
