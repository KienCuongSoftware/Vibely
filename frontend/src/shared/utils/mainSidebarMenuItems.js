import {
  IoCompass,
  IoCompassOutline,
  IoEllipsisHorizontal,
  IoEllipsisHorizontalOutline,
  IoHome,
  IoHomeOutline,
  IoNotifications,
  IoNotificationsOutline,
  IoPaperPlane,
  IoPaperPlaneOutline,
  IoPeople,
  IoPeopleOutline,
  IoPerson,
  IoPersonAdd,
  IoPersonAddOutline,
  IoPersonOutline,
  IoTv,
  IoTvOutline,
} from 'react-icons/io5'
import { MdFileUpload, MdOutlineFileUpload } from 'react-icons/md'

/** Sidebar items use i18n keys under `nav.*` (resolve with t(labelKey) in Sidebar). */
export function buildMainSidebarMenuItems(token) {
  return [
    { id: 'latest', labelKey: 'nav.forYou', icon: IoHomeOutline, activeIcon: IoHome },
    { id: 'explore', labelKey: 'nav.explore', icon: IoCompassOutline, activeIcon: IoCompass },
    { id: 'following', labelKey: 'nav.following', icon: IoPersonAddOutline, activeIcon: IoPersonAdd },
    ...(token ? [{ id: 'friends', labelKey: 'nav.friends', icon: IoPeopleOutline, activeIcon: IoPeople }] : []),
    { id: 'live', labelKey: 'nav.live', icon: IoTvOutline, activeIcon: IoTv },
    ...(token
      ? [
          { id: 'messages', labelKey: 'nav.messages', icon: IoPaperPlaneOutline, activeIcon: IoPaperPlane },
          { id: 'activity', labelKey: 'nav.activity', icon: IoNotificationsOutline, activeIcon: IoNotifications },
        ]
      : []),
    { id: 'upload', labelKey: 'nav.upload', icon: MdOutlineFileUpload, activeIcon: MdFileUpload },
    { id: 'profile', labelKey: 'nav.profile', icon: IoPersonOutline, activeIcon: IoPerson },
    { id: 'more', labelKey: 'nav.more', icon: IoEllipsisHorizontalOutline, activeIcon: IoEllipsisHorizontal },
  ]
}
