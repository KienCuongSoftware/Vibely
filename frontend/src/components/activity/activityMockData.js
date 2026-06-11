/** Frontend-only mock inbox until notification API ships. */
export const MOCK_SYSTEM_INBOX = {
  preview: 'LIVE: Khám phá cách phát trực tiếp mới trên Vibely…',
}

export const MOCK_SYSTEM_NOTIFICATIONS = [
  {
    id: 'sys-1',
    category: 'live',
    badge: 'LIVE',
    title: 'Bạn có đam mê bóng đá?',
    body: 'Có cách mới để nhận thưởng — chạm để xem chi tiết.',
    createdAt: '2026-06-11T12:00:01.000Z',
  },
  {
    id: 'sys-2',
    category: 'live',
    badge: 'LIVE',
    title: 'Khám phá cách phát LIVE trên Vibely',
    body: 'Bắt đầu buổi phát trực tiếp đầu tiên và kết nối với người xem.',
    createdAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'sys-3',
    category: 'transaction',
    title: 'Cập nhật chính sách giao dịch',
    body: 'Xem lại điều khoản mới cho Vibely Shop và thanh toán trong app.',
    createdAt: '2026-05-20T10:00:00.000Z',
  },
  {
    id: 'sys-4',
    category: 'system',
    title: 'Chào mừng đến Vibely',
    body: 'Khám phá video mới và theo dõi nhà sáng tạo bạn yêu thích.',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
]

export const MOCK_ACTIVITY_ITEMS = [
  {
    id: 'act-1',
    type: 'comment_reply',
    filter: 'comments',
    section: 'today',
    actor: {
      username: 'minhnguyen_dev',
      displayName: 'Minh Nguyễn',
      avatarUrl: '',
    },
    preview: 'node js với java thì cái nào dễ xin việc hơn nhỉ…',
    videoPublicId: 'demo-video-1',
    createdAt: '2026-06-11T09:15:00.000Z',
  },
  {
    id: 'act-2',
    type: 'comment_like',
    filter: 'likes',
    section: 'today',
    actor: {
      username: 'lan_anh_coder',
      displayName: 'Lan Anh',
      avatarUrl: '',
    },
    preview: 'clip này hay quá, save lại học theo',
    videoPublicId: 'demo-video-2',
    createdAt: '2026-06-11T08:40:00.000Z',
  },
  {
    id: 'act-3',
    type: 'video_like',
    filter: 'likes',
    section: 'today',
    actor: {
      username: 'tuanvu_studio',
      displayName: 'Tuấn Vũ',
      avatarUrl: '',
    },
    videoPublicId: 'demo-video-1',
    createdAt: '2026-06-11T07:20:00.000Z',
  },
  {
    id: 'act-4',
    type: 'mention',
    filter: 'mentions',
    section: 'today',
    actor: {
      username: 'haile_code',
      displayName: 'Hải Lê',
      avatarUrl: '',
    },
    preview: '@kiencuongdev2004 bạn check inbox giúp mình nhé',
    videoPublicId: 'demo-video-3',
    createdAt: '2026-06-11T06:05:00.000Z',
  },
  {
    id: 'act-5',
    type: 'follow',
    filter: 'followers',
    section: 'earlier',
    actor: {
      id: 2,
      username: 'vibely_fan_42',
      displayName: 'Vibely Fan',
      avatarUrl: '',
    },
    viewerFollowsActor: false,
    createdAt: '2026-06-09T14:30:00.000Z',
  },
  {
    id: 'act-6',
    type: 'comment_reply',
    filter: 'comments',
    section: 'earlier',
    actor: {
      username: 'devdaily_vn',
      displayName: 'Dev Daily VN',
      avatarUrl: '',
    },
    preview: 'mình vote Spring Boot cho backend team nhỏ',
    videoPublicId: 'demo-video-4',
    createdAt: '2026-06-08T11:00:00.000Z',
  },
]
