import React from 'react'

/** Empty state panel bình luận — giống TikTok web. */
export function FeedCommentsEmptyState({
  message = 'Bắt đầu cuộc trò chuyện',
}) {
  return (
    <div
      className="flex min-h-[min(420px,50vh)] flex-col items-center justify-center px-6 py-16 text-center"
      role="status"
    >
      <svg
        className="mb-5 h-[72px] w-[72px] text-zinc-500"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="48" cy="78" rx="18" ry="4" fill="currentColor" opacity="0.25" />
        <path
          d="M48 22c-11.6 0-21 8.5-21 19s9.4 19 21 19c2.2 0 4.3-.3 6.3-.9l8.7 4.4-2.2-7.8c4.8-3.5 7.2-8.6 7.2-14.7 0-10.5-9.4-19-21-19Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="38" cy="41" r="2.5" fill="currentColor" />
        <circle cx="48" cy="41" r="2.5" fill="currentColor" />
        <circle cx="58" cy="41" r="2.5" fill="currentColor" />
        <path
          d="M62 18c6.1 0 11 4.9 11 11 0 3.1-1.3 5.9-3.3 7.9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M68 12v8M64 16h8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="max-w-[220px] text-[15px] font-semibold leading-snug text-zinc-400">
        {message}
      </p>
    </div>
  )
}
