import { request, toQuery } from "@/shared/api/http.js";

export const placesApi = {
  searchPlaces: (q, { limit = 8, token } = {}) =>
    request(`/api/places/search${toQuery({ q, limit })}`, token ? { token } : {}),
};
