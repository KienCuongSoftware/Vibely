const AUTH_FOCUS_RESET =
  "ring-0 focus:ring-0 focus-visible:ring-0 outline-none focus:outline-none focus-visible:outline-none";

/** Ô nhập auth: không viền trắng khi focus (kiểu TikTok). */
export const AUTH_FIELD = `vibely-auth-input ${AUTH_FOCUS_RESET} h-10 w-full rounded bg-zinc-800 px-4 text-[13px] text-zinc-200`;

export const AUTH_FIELD_WITH_ICON = `vibely-auth-input ${AUTH_FOCUS_RESET} h-10 w-full rounded bg-zinc-800 px-4 pr-10 text-[13px] text-zinc-200`;

export const AUTH_FIELD_ERROR = `vibely-auth-input vibely-auth-input--error ${AUTH_FOCUS_RESET} h-10 w-full rounded bg-zinc-800 px-4 pr-10 text-[13px]`;

export const AUTH_FIELD_OTP = `vibely-auth-input ${AUTH_FOCUS_RESET} h-10 flex-1 rounded-l bg-zinc-800 px-4 text-[13px] text-zinc-200`;

export const AUTH_FIELD_AT = `vibely-auth-input ${AUTH_FOCUS_RESET} h-10 w-full rounded bg-zinc-800 pl-7 pr-4 text-[13px] text-zinc-200`;
