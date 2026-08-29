/** Mock LIVE streams — replace with API when backend is ready. */

export const LIVE_CATEGORIES = [
  { id: 'recommended', labelKey: 'livePage.categories.recommended' },
  { id: 'following', labelKey: 'livePage.categories.following' },
  { id: 'gaming', labelKey: 'livePage.categories.gaming' },
  { id: 'lifestyle', labelKey: 'livePage.categories.lifestyle' },
  { id: 'freefire', labelKey: 'livePage.categories.freeFire' },
  { id: 'pubg', labelKey: 'livePage.categories.pubg' },
  { id: 'music', labelKey: 'livePage.categories.music' },
  { id: 'outdoor', labelKey: 'livePage.categories.outdoor' },
  { id: 'chat', labelKey: 'livePage.categories.chat' },
  { id: 'food', labelKey: 'livePage.categories.food' },
]

export const LIVE_RECOMMENDED_CREATORS = [
  {
    id: 'c1',
    username: 'hoavinh....',
    displayName: 'hoavinh....',
    avatarUrl: 'https://picsum.photos/seed/vibely-live-1/96/96',
    viewerCount: 2700,
    verified: true,
    isLive: true,
  },
  {
    id: 'c2',
    username: 'minhan.live',
    displayName: 'minhan.live',
    avatarUrl: 'https://picsum.photos/seed/vibely-live-2/96/96',
    viewerCount: 890,
    verified: false,
    isLive: true,
  },
  {
    id: 'c3',
    username: 'gamezone_vn',
    displayName: 'gamezone_vn',
    avatarUrl: 'https://picsum.photos/seed/vibely-live-3/96/96',
    viewerCount: 420,
    verified: true,
    isLive: true,
  },
]

export const LIVE_FEATURED_STREAM = {
  id: 'featured-1',
  title: 'PUBG Mobile — rank push cùng squad',
  username: 'pubgmaster_vn',
  displayName: 'PUBG Master VN',
  avatarUrl: 'https://picsum.photos/seed/vibely-live-feat-avatar/80/80',
  coverUrl: 'https://picsum.photos/seed/vibely-live-feat-cover/1280/720',
  webcamUrl: 'https://picsum.photos/seed/vibely-live-feat-cam/160/120',
  viewerCount: 12400,
  categoryId: 'gaming',
  verified: true,
}

export const LIVE_GAMING_STREAMS = [
  {
    id: 'g1',
    title: 'Free Fire — solo rank',
    username: 'ff_legend',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g1/360/640',
    viewerCount: 3200,
  },
  {
    id: 'g2',
    title: 'Liên Quân — leo rank',
    username: 'aov_pro',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g2/360/640',
    viewerCount: 1800,
  },
  {
    id: 'g3',
    title: 'Minecraft build',
    username: 'blockcraft',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g3/360/640',
    viewerCount: 950,
  },
  {
    id: 'g4',
    title: 'Valorant ranked',
    username: 'valo_vn',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g4/360/640',
    viewerCount: 2100,
  },
  {
    id: 'g5',
    title: 'GTA RP night',
    username: 'cityrp',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g5/360/640',
    viewerCount: 760,
  },
  {
    id: 'g6',
    title: 'CS2 competitive',
    username: 'cs2_vn',
    coverUrl: 'https://picsum.photos/seed/vibely-live-g6/360/640',
    viewerCount: 540,
  },
]

export const LIVE_LIFESTYLE_STREAMS = [
  {
    id: 'l1',
    title: 'Cooking dinner live',
    username: 'chef_lan',
    coverUrl: 'https://picsum.photos/seed/vibely-live-l1/360/640',
    viewerCount: 430,
  },
  {
    id: 'l2',
    title: 'Night city walk',
    username: 'street_vn',
    coverUrl: 'https://picsum.photos/seed/vibely-live-l2/360/640',
    viewerCount: 620,
  },
  {
    id: 'l3',
    title: 'Study with me',
    username: 'focus_room',
    coverUrl: 'https://picsum.photos/seed/vibely-live-l3/360/640',
    viewerCount: 280,
  },
  {
    id: 'l4',
    title: 'Morning yoga',
    username: 'zenflow',
    coverUrl: 'https://picsum.photos/seed/vibely-live-l4/360/640',
    viewerCount: 190,
  },
]
