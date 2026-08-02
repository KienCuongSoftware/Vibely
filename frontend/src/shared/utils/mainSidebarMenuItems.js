import {
  IoCompassOutline,
  IoEllipsisHorizontalOutline,
  IoHomeOutline,
  IoNotificationsOutline,
  IoPaperPlaneOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
  IoPersonOutline,
  IoTvOutline,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'

export function buildMainSidebarMenuItems(token) {
  return [
    { id: 'latest', label: 'Đề xuất', icon: IoHomeOutline },
    { id: 'explore', label: 'Khám phá', icon: IoCompassOutline },
    { id: 'following', label: 'Đã follow', icon: IoPersonAddOutline },
    ...(token
      ? [
          { id: 'friends', label: 'Bạn bè', icon: IoPeopleOutline },
          { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlaneOutline },
          { id: 'activity', label: 'Hoạt động', icon: IoNotificationsOutline },
        ]
      : []),
    { id: 'live', label: 'LIVE', icon: IoTvOutline },
    { id: 'upload', label: 'Tải lên', icon: MdOutlineFileUpload },
    { id: 'profile', label: 'Hồ sơ', icon: IoPersonOutline },
    { id: 'more', label: 'Thêm', icon: IoEllipsisHorizontalOutline },
  ]
}
