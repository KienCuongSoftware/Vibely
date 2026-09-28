import { LIVE_STATUS, LIVE_VISIBILITY } from '@/features/live/constants/liveConstants.js'

/**
 * Seed data for the mock LIVE service only. UI code must never import this file —
 * go through `services/liveService.js` so the backend can replace it.
 */

const picsum = (seed, width, height) => `https://picsum.photos/seed/${seed}/${width}/${height}`

function host(id, username, displayName, verified = false) {
  return {
    id,
    username,
    displayName,
    avatarUrl: picsum(`vibely-live-host-${id}`, 96, 96),
    verified,
  }
}

function seedLive({ id, title, categoryId, viewerCount, likeCount, host: liveHost, description = '' }) {
  return {
    id,
    title,
    description,
    categoryId,
    status: LIVE_STATUS.LIVE,
    coverUrl: picsum(`vibely-live-${id}`, 1280, 720),
    portraitCoverUrl: picsum(`vibely-live-${id}-portrait`, 720, 1280),
    viewerCount,
    likeCount,
    startedAt: null,
    endedAt: null,
    host: liveHost,
    settings: {
      visibility: LIVE_VISIBILITY.PUBLIC,
      allowComments: true,
      allowGifts: true,
      allowGuests: false,
      matureContent: false,
    },
    playback: { type: null, url: null },
  }
}

export const MOCK_LIVES = [
  seedLive({ id: 'pubg-rank-push', title: 'PUBG Mobile — rank push cùng squad', categoryId: 'pubg', viewerCount: 12400, likeCount: 184000, host: host('h1', 'pubgmaster_vn', 'PUBG Master VN', true), description: 'Leo rank Chí Tôn cùng squad, giao lưu với anh em.' }),
  seedLive({ id: 'ff-solo-rank', title: 'Free Fire — solo rank', categoryId: 'freefire', viewerCount: 3200, likeCount: 45200, host: host('h2', 'ff_legend', 'FF Legend') }),
  seedLive({ id: 'english-chat', title: 'English chat live', categoryId: 'chat', viewerCount: 254, likeCount: 3100, host: host('h3', 'english_coach', 'Cô Dung English', true), description: 'Luyện nói tiếng Anh mỗi tối, hỏi gì đáp nấy.' }),
  seedLive({ id: 'valorant-ranked', title: 'Valorant ranked', categoryId: 'gaming', viewerCount: 2100, likeCount: 28700, host: host('h4', 'valo_vn', 'Valo VN') }),
  seedLive({ id: 'aov-climb', title: 'Liên Quân — leo rank', categoryId: 'gaming', viewerCount: 1800, likeCount: 19800, host: host('h5', 'aov_pro', 'AOV Pro') }),
  seedLive({ id: 'minecraft-build', title: 'Minecraft build', categoryId: 'gaming', viewerCount: 950, likeCount: 8700, host: host('h6', 'blockcraft', 'BlockCraft') }),
  seedLive({ id: 'gta-rp-night', title: 'GTA RP night', categoryId: 'gaming', viewerCount: 760, likeCount: 6400, host: host('h7', 'cityrp', 'City RP') }),
  seedLive({ id: 'cs2-competitive', title: 'CS2 competitive', categoryId: 'gaming', viewerCount: 540, likeCount: 4100, host: host('h8', 'cs2_vn', 'CS2 VN') }),
  seedLive({ id: 'roblox-chill', title: 'Roblox chill stream', categoryId: 'gaming', viewerCount: 410, likeCount: 2900, host: host('h9', 'roblox_vn', 'Roblox VN') }),
  seedLive({ id: 'pubg-scrim', title: 'PUBG scrim tối nay', categoryId: 'pubg', viewerCount: 380, likeCount: 2600, host: host('h10', 'pubg_scrim', 'PUBG Scrim') }),
  seedLive({ id: 'cooking-dinner', title: 'Cooking dinner live', categoryId: 'food', viewerCount: 430, likeCount: 5200, host: host('h11', 'chef_lan', 'Chef Lan', true) }),
  seedLive({ id: 'night-city-walk', title: 'Night city walk', categoryId: 'outdoor', viewerCount: 620, likeCount: 7300, host: host('h12', 'street_vn', 'Street VN') }),
  seedLive({ id: 'study-with-me', title: 'Study with me', categoryId: 'lifestyle', viewerCount: 280, likeCount: 1900, host: host('h13', 'focus_room', 'Focus Room') }),
  seedLive({ id: 'morning-yoga', title: 'Morning yoga', categoryId: 'lifestyle', viewerCount: 190, likeCount: 1500, host: host('h14', 'zenflow', 'ZenFlow') }),
  seedLive({ id: 'acoustic-night', title: 'Acoustic night — hát theo yêu cầu', categoryId: 'music', viewerCount: 2700, likeCount: 39100, host: host('h15', 'hoavinh', 'Hoa Vinh', true) }),
]

/** Hosts the mock viewer "follows" — drives the `following` filter. */
export const MOCK_FOLLOWED_HOST_IDS = new Set(['h1', 'h3', 'h15'])

export const MOCK_FEATURED_LIVE_IDS = ['pubg-rank-push', 'ff-solo-rank', 'english-chat', 'valorant-ranked']

export const MOCK_GIFTS = [
  { id: 'rose', name: 'Rose', icon: '🌹', coinPrice: 1 },
  { id: 'heart', name: 'Heart', icon: '💖', coinPrice: 5 },
  { id: 'finger-heart', name: 'Finger Heart', icon: '🫰', coinPrice: 5 },
  { id: 'donut', name: 'Donut', icon: '🍩', coinPrice: 30 },
  { id: 'cap', name: 'Cap', icon: '🧢', coinPrice: 99 },
  { id: 'crown', name: 'Crown', icon: '👑', coinPrice: 299 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', coinPrice: 1999 },
  { id: 'universe', name: 'Universe', icon: '🌌', coinPrice: 34999 },
]

export const MOCK_CHAT_AUTHORS = [
  { id: 'u1', username: 'linh.nguyen', displayName: 'Linh Nguyễn', avatarUrl: picsum('vibely-live-chat-1', 64, 64) },
  { id: 'u2', username: 'tuan_gamer', displayName: 'Tuấn Gamer', avatarUrl: picsum('vibely-live-chat-2', 64, 64) },
  { id: 'u3', username: 'mai.anh', displayName: 'Mai Anh', avatarUrl: picsum('vibely-live-chat-3', 64, 64), verified: true },
  { id: 'u4', username: 'quang.hd', displayName: 'Quang HD', avatarUrl: picsum('vibely-live-chat-4', 64, 64) },
  { id: 'u5', username: 'thu.trang', displayName: 'Thu Trang', avatarUrl: picsum('vibely-live-chat-5', 64, 64) },
]

export const MOCK_CHAT_LINES = [
  'Xin chào mọi người 👋',
  'Hay quá!',
  'Idol ơi cho xin info bài hát',
  '❤️❤️❤️',
  'Đỉnh thật sự',
  'Vừa vào, đang xem gì vậy?',
  'Chúc idol live vui vẻ',
  'Cho mình xin 1 tim nhé',
  'GG!',
  'Hello from Hà Nội',
]

/** Mock realtime cadence — tuned to feel alive without flooding the UI. */
export const MOCK_REALTIME = Object.freeze({
  COMMENT_INTERVAL_MS: 2200,
  VIEWER_INTERVAL_MS: 5000,
  VIEWER_DRIFT_RATIO: 0.03,
  INITIAL_COMMENT_COUNT: 6,
  NETWORK_DELAY_MS: 350,
})
