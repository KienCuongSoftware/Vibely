import { authApi } from "@/features/auth/api/authApi.js";
import { adminApi } from "@/features/admin/api/adminApi.js";
import { profileApi } from "@/features/profile/api/profileApi.js";
import { userApi } from "@/features/user/api/userApi.js";
import { settingsApi } from "@/features/settings/api/settingsApi.js";
import { feedApi } from "@/features/feed/api/feedApi.js";
import { studioApi } from "@/features/studio/api/studioApi.js";
import { postApi } from "@/features/post/api/postApi.js";
import { exploreApi } from "@/features/explore/api/exploreApi.js";
import { searchApi } from "@/features/search/api/searchApi.js";
import { uploadApi, uploadThumbnailToStorage } from "@/features/upload/api/uploadApi.js";
import { uploadVideoFile } from "@/features/upload/utils/multipartVideoUpload.js";
import { reactionApi } from "@/features/reaction/api/reactionApi.js";
import { bookmarkApi } from "@/features/bookmark/api/bookmarkApi.js";
import { commentApi } from "@/features/comment/api/commentApi.js";
import { reportApi } from "@/features/report/api/reportApi.js";
import { followApi } from "@/features/follow/api/followApi.js";
import { chatApi } from "@/features/chat/api/chatApi.js";
import { notificationApi } from "@/features/notification/api/notificationApi.js";
import { moderationApi } from "@/features/moderation/api/moderationApi.js";

export { uploadToPresignedPutUrl } from "@/shared/api/http.js";
export { uploadThumbnailToStorage, uploadVideoFile };

/**
 * Facade giữ tương thích ngược: mọi chỗ cũ `apiClient.xxx` vẫn chạy.
 * API mới nên import trực tiếp từ `features/<domain>/api`.
 */
export const apiClient = {
  ...authApi,
  ...userApi,
  ...settingsApi,
  ...profileApi,
  ...feedApi,
  ...studioApi,
  ...adminApi,
  ...moderationApi,
  ...postApi,
  ...exploreApi,
  ...searchApi,
  ...uploadApi,
  ...reactionApi,
  ...bookmarkApi,
  ...commentApi,
  ...reportApi,
  ...followApi,
  ...chatApi,
  ...notificationApi,
};
