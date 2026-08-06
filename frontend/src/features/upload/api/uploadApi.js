import { request, uploadToPresignedPutUrl } from "@/shared/api/http.js";

export const uploadApi = {
  presignVideoUpload: (token, body) =>
    request("/api/videos/upload/presign", { method: "POST", body, token }),
  presignThumbnailUpload: (token, body) =>
    request("/api/videos/upload/presign-thumbnail", {
      method: "POST",
      body,
      token,
    }),
  initiateMultipartVideoUpload: (token, body) =>
    request("/api/videos/upload/multipart/initiate", {
      method: "POST",
      body,
      token,
    }),
  presignMultipartVideoParts: (token, body) =>
    request("/api/videos/upload/multipart/presign-parts", {
      method: "POST",
      body,
      token,
    }),
  completeMultipartVideoUpload: (token, body) =>
    request("/api/videos/upload/multipart/complete", {
      method: "POST",
      body,
      token,
    }),
  abortMultipartVideoUpload: (token, body) =>
    request("/api/videos/upload/multipart/abort", {
      method: "POST",
      body,
      token,
    }),
};

/** Tải blob ảnh bìa lên S3 qua presign, trả về URL công khai. */
export async function uploadThumbnailToStorage(
  token,
  blob,
  fileName = "cover.jpg",
) {
  const ct =
    blob.type && String(blob.type).startsWith("image/")
      ? blob.type
      : "image/jpeg";
  const name =
    fileName && /\.(jpe?g|png|webp)$/i.test(fileName) ? fileName : "cover.jpg";
  const presign = await uploadApi.presignThumbnailUpload(token, {
    contentType: ct === "image/jpg" ? "image/jpeg" : ct,
    fileName: name,
  });
  await uploadToPresignedPutUrl(presign.uploadUrl, blob, presign.contentType);
  return presign.playbackUrl;
}
