import {
  MdExplore,
  MdFileUpload,
  MdHome,
  MdLiveTv,
  MdMoreHoriz,
  MdNotifications,
  MdOutlineExplore,
  MdOutlineFileUpload,
  MdOutlineHome,
  MdOutlineLiveTv,
  MdOutlineMoreHoriz,
  MdOutlineNotifications,
  MdOutlinePeople,
  MdOutlinePerson,
  MdOutlinePersonAdd,
  MdOutlineSend,
  MdPeople,
  MdPerson,
  MdPersonAdd,
  MdSend,
} from 'react-icons/md'

/** Sidebar items use i18n keys under `nav.*` (resolve with t(labelKey) in Sidebar). */
export function buildMainSidebarMenuItems(token) {
  return [
    { id: 'latest', labelKey: 'nav.forYou', icon: MdOutlineHome, activeIcon: MdHome },
    { id: 'explore', labelKey: 'nav.explore', icon: MdOutlineExplore, activeIcon: MdExplore },
    { id: 'following', labelKey: 'nav.following', icon: MdOutlinePersonAdd, activeIcon: MdPersonAdd },
    ...(token ? [{ id: 'friends', labelKey: 'nav.friends', icon: MdOutlinePeople, activeIcon: MdPeople }] : []),
    { id: 'live', labelKey: 'nav.live', icon: MdOutlineLiveTv, activeIcon: MdLiveTv },
    ...(token
      ? [
          { id: 'messages', labelKey: 'nav.messages', icon: MdOutlineSend, activeIcon: MdSend },
          { id: 'activity', labelKey: 'nav.activity', icon: MdOutlineNotifications, activeIcon: MdNotifications },
        ]
      : []),
    { id: 'upload', labelKey: 'nav.upload', icon: MdOutlineFileUpload, activeIcon: MdFileUpload },
    { id: 'profile', labelKey: 'nav.profile', icon: MdOutlinePerson, activeIcon: MdPerson },
    { id: 'more', labelKey: 'nav.more', icon: MdOutlineMoreHoriz, activeIcon: MdMoreHoriz },
  ]
}
