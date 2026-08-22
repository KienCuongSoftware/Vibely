import React from "react";

/**
 * Logo sidebar kiểu TikTok: nốt nhạc (cyan/magenta) + chữ Vibely, 105×28.
 */
export function VibelyWordmark({ className = "h-7 w-auto", title = "Vibely" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="105"
      height="28"
      viewBox="0 0 105 28"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <g transform="translate(1.2 1.2) scale(0.0818) translate(-36 -96)">
        <g fill="#25F4EE" transform="translate(-10 -8)">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
        <g fill="#FE2C55" transform="translate(10 8)">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
        <g fill="currentColor">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
      </g>
      <text
        x="30"
        y="21.2"
        fill="currentColor"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="17.5"
        fontWeight="800"
        letterSpacing="-0.045em"
      >
        Vibely
      </text>
    </svg>
  );
}

export function VibelyMarkIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
    >
      <g transform="translate(1.2 1.2) scale(0.0818) translate(-36 -96)">
        <g fill="#25F4EE" transform="translate(-10 -8)">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
        <g fill="#FE2C55" transform="translate(10 8)">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
        <g fill="currentColor">
          <ellipse cx="128" cy="336" rx="92" ry="78" />
          <rect x="186" y="96" width="32" height="256" rx="14" />
          <path d="M218 104C304 128 320 196 278 236C260 254 240 264 232 268L232 244C248 238 264 228 272 216C290 192 282 154 218 138Z" />
        </g>
      </g>
    </svg>
  );
}
