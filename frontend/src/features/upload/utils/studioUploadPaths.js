export const STUDIO_UPLOAD_VIDEO_PATH =
  '/vibelystudio/upload?from=webapp&tab=video'
export const STUDIO_UPLOAD_PHOTO_PATH =
  '/vibelystudio/upload?from=webapp&tab=photo'
export const STUDIO_PHOTO_POST_PATH = '/vibelystudio/upload/post/photo'

export const PHOTO_UPLOAD_MAX_FILES = 35
export const PHOTO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024
export const PHOTO_UPLOAD_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

export function isAllowedPhotoFile(file) {
  if (!file) return false
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const okType =
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    /\.(jpe?g|png|webp)$/.test(name)
  return okType && file.size > 0 && file.size <= PHOTO_UPLOAD_MAX_BYTES
}
