import {
  IoCompass,
  IoEllipsisHorizontal,
  IoHome,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoVideocam,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'

export function buildMainSidebarMenuItems(token) {
  return [
    { id: 'latest', label: 'Đề xuất', icon: IoHome },
    { id: 'explore', label: 'Khám phá', icon: IoCompass },
    { id: 'following', label: 'Đã follow', icon: IoPeople },
    ...(token
      ? [
          { id: 'friends', label: 'Bạn bè', icon: IoPeople },
          { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlane },
          { id: 'activity', label: 'Hoạt động', icon: IoNotifications },
        ]
      : []),
    { id: 'live', label: 'LIVE', icon: IoVideocam },
    { id: 'upload', label: 'Tải lên', icon: MdOutlineFileUpload },
    { id: 'profile', label: 'Hồ sơ', icon: IoPerson },
    { id: 'more', label: 'Thêm', icon: IoEllipsisHorizontal },
  ]
}
