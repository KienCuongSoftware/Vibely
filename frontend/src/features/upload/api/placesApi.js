import { request, toQuery } from "@/shared/api/http.js";

export const placesApi = {
  searchPlaces: (q, { limit = 8, lat, lng, token } = {}) =>
    request(
      `/api/places/search${toQuery({
        q,
        limit,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
      })}`,
      token ? { token } : {},
    ),
  nearbyPlaces: ({ lat, lng, limit = 12, token } = {}) =>
    request(
      `/api/places/nearby${toQuery({ lat, lng, limit })}`,
      token ? { token } : {},
    ),
  suggestPlaces: ({ lat, lng, limit = 16, token } = {}) =>
    request(
      `/api/places/suggestions${toQuery({
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        limit,
      })}`,
      token ? { token } : {},
    ),
};
