import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const SEARCH_Q = __ENV.SEARCH_Q || 'vibely';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
  },
};

function firstVideo(feedBody) {
  try {
    const json = JSON.parse(feedBody);
    const items = json.data && json.data.items ? json.data.items : [];
    return items.length ? items[0] : null;
  } catch (e) {
    return null;
  }
}

export default function () {
  let publicId = __ENV.VIDEO_PUBLIC_ID;
  let username = __ENV.USERNAME;

  group('feed', () => {
    const res = http.get(`${BASE}/api/feed/for-you?size=20`);
    check(res, { 'feed 200': (r) => r.status === 200 });
    const video = firstVideo(res.body);
    if (video) {
      if (!publicId && video.publicId) {
        publicId = video.publicId;
      }
      if (!username && video.authorUsername) {
        username = video.authorUsername;
      }
    }
  });

  if (publicId) {
    group('video', () => {
      const res = http.get(`${BASE}/api/videos/${publicId}`);
      check(res, { 'video 200': (r) => r.status === 200 });
    });
    group('comments', () => {
      const res = http.get(`${BASE}/api/videos/${publicId}/comments`);
      check(res, { 'comments 200': (r) => r.status === 200 });
    });
  }

  group('search', () => {
    const res = http.get(`${BASE}/api/search/videos?q=${encodeURIComponent(SEARCH_Q)}`);
    check(res, { 'search 200': (r) => r.status === 200 });
  });

  if (username) {
    group('profile', () => {
      const res = http.get(`${BASE}/api/users/${encodeURIComponent(username)}`);
      check(res, { 'profile 200': (r) => r.status === 200 });
    });
  }

  sleep(0.3);
}
