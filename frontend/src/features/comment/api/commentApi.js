import { request } from "@/shared/api/http.js";

export const commentApi = {
  getComments: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}/comments`, token ? { token } : {}),
  addComment: (publicId, content, token, { parentCommentId } = {}) =>
    request(`/api/videos/${publicId}/comments`, {
      method: "POST",
      body: {
        content,
        ...(parentCommentId != null ? { parentCommentId } : {}),
      },
      token,
    }),
  deleteComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}`, {
      method: "DELETE",
      token,
    }),
  likeComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}/likes`, {
      method: "POST",
      token,
    }),
  unlikeComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}/likes`, {
      method: "DELETE",
      token,
    }),
};
