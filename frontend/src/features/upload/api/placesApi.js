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
};
