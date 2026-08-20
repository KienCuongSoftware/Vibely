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

/** Sidebar items use i18n keys under `nav.*` (resolve with t(labelKey) in Sidebar). */
export function buildMainSidebarMenuItems(token) {
  return [
    { id: 'latest', labelKey: 'nav.forYou', icon: IoHomeOutline },
    { id: 'explore', labelKey: 'nav.explore', icon: IoCompassOutline },
    { id: 'following', labelKey: 'nav.following', icon: IoPersonAddOutline },
    ...(token ? [{ id: 'friends', labelKey: 'nav.friends', icon: IoPeopleOutline }] : []),
    { id: 'live', labelKey: 'nav.live', icon: IoTvOutline },
    ...(token
      ? [
          { id: 'messages', labelKey: 'nav.messages', icon: IoPaperPlaneOutline },
          { id: 'activity', labelKey: 'nav.activity', icon: IoNotificationsOutline },
        ]
      : []),
    { id: 'upload', labelKey: 'nav.upload', icon: MdOutlineFileUpload },
    { id: 'profile', labelKey: 'nav.profile', icon: IoPersonOutline },
    { id: 'more', labelKey: 'nav.more', icon: IoEllipsisHorizontalOutline },
  ]
}
