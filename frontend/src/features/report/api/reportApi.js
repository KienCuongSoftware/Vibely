import { request } from "@/shared/api/http.js";

export const reportApi = {
  reportVideo: (publicId, reason, token) =>
    request(`/api/videos/${publicId}/report`, {
      method: "POST",
      body: { reason },
      token,
    }),
};
