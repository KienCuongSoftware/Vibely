import { request, toQuery } from "@/shared/api/http.js";

export const userApi = {
  checkUsername: (username, { confirm = false } = {}) =>
    request(
      `/api/users/check-username${toQuery({ username, confirm: confirm || undefined })}`,
    ),
  checkEmail: (email, { confirm = false } = {}) =>
    request(
      `/api/users/check-email${toQuery({ email, confirm: confirm || undefined })}`,
    ),
};
