import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IoHappyOutline } from "react-icons/io5";
import { apiClient } from "../../api/client";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

export const COMMENT_EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗",
  "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤",
  "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "😵", "🤯", "🤠",
  "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺",
  "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓",
  "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "👍", "👎", "👏", "🙌", "❤️",
  "🔥", "💯", "🎉", "✨", "💀", "🙏", "💪", "😈", "👀", "🤡", "💕", "💔",
];

const TIP_CLASSES =
  "pointer-events-none absolute bottom-full right-0 z-30 mb-2 rounded-lg bg-[#545454] px-3 py-2 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150";

const BTN_BASE =
  "flex shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export function findMentionAtCaret(text, caret) {
  const source = String(text ?? "");
  const pos = Math.max(0, Number(caret ?? source.length));
  const before = source.slice(0, pos);
  const match = before.match(/(?:^|\s)@([a-zA-Z0-9._]*)$/);
  if (!match) return null;
  const full = match[0];
  const query = match[1] ?? "";
  const replaceStart = pos - full.length + (/^\s/.test(full) ? 1 : 0);
  return { query, replaceStart };
}

function useAccessoryPopoverPosition(
  anchorRef,
  open,
  { width = 280, maxHeight = 240, placement = "above", gap = 8 } = {},
) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const panelW = Math.min(width, Math.max(240, Math.round(rect.width)));
      let left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));

      if (placement === "below") {
        const top = rect.bottom + gap;
        const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
        if (spaceBelow < 120) {
          // Flip above: pin panel bottom to input top
          const available = Math.max(120, rect.top - gap - 8);
          left = Math.max(
            8,
            Math.min(rect.left, window.innerWidth - panelW - 8),
          );
          setPos({
            bottom: window.innerHeight - rect.top + gap,
            left,
            width: panelW,
            maxHeight: Math.min(maxHeight, available),
          });
        } else {
          setPos({
            top,
            left,
            width: panelW,
            maxHeight: Math.min(maxHeight, spaceBelow),
          });
        }
        return;
      }

      // "above": always pin bottom edge just above the input (TikTok-style),
      // so short tip and tall user lists share the same anchor.
      left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - panelW - 8),
      );
      const available = Math.max(120, rect.top - gap - 8);
      setPos({
        bottom: window.innerHeight - rect.top + gap,
        left,
        width: panelW,
        maxHeight: Math.min(maxHeight, available),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, gap, maxHeight, open, placement, width]);

  return pos;
}

function CommentAccessoryPopover({
  anchorRef,
  open,
  popoverRef,
  width = 280,
  maxHeight = 240,
  placement = "above",
  children,
}) {
  const pos = useAccessoryPopoverPosition(anchorRef, open, {
    width,
    maxHeight,
    placement,
  });
  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#252525] shadow-2xl"
      style={{
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight ?? maxHeight,
        ...(pos.bottom != null ? { bottom: pos.bottom } : { top: pos.top }),
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function CommentMentionPicker({ token, open, filterQuery = "", onPick }) {
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchRows, setSearchRows] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (!token || !open) return;
    let cancelled = false;
    setLoadingFriends(true);
    apiClient
      .getMentionableFriends(token)
      .then((rows) => {
        if (!cancelled) setFriends(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const effectiveQuery = String(filterQuery ?? "").trim();

  useEffect(() => {
    const q = effectiveQuery;
    if (!q) {
      setSearchRows([]);
      setLoadingSearch(false);
      return;
    }
    let cancelled = false;
    setLoadingSearch(true);
    apiClient
      .getSearchUsers(q, { limit: 12 })
      .then((rows) => {
        if (!cancelled) setSearchRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setSearchRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSearch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveQuery]);

  const friendKeys = useMemo(
    () =>
      new Set(
        friends
          .map((u) => String(u?.username ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    [friends],
  );

  const suggestions = useMemo(() => {
    const q = effectiveQuery.toLowerCase();
    const source = q ? searchRows : friends;
    const seen = new Set();
    return source
      .filter((row) => {
        const username = String(row?.username ?? "").trim();
        if (!username) return false;
        const key = username.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const aKey = String(a?.username ?? "").trim().toLowerCase();
        const bKey = String(b?.username ?? "").trim().toLowerCase();
        const aFriend = friendKeys.has(aKey);
        const bFriend = friendKeys.has(bKey);
        if (aFriend !== bFriend) return aFriend ? -1 : 1;
        return aKey.localeCompare(bKey);
      });
  }, [effectiveQuery, friendKeys, friends, searchRows]);

  const loading = effectiveQuery ? loadingSearch : loadingFriends;

  return (
    <div className="flex max-h-[min(280px,50vh)] flex-col py-1">
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
        {loading ? (
          <p className="px-3 py-3 text-xs text-zinc-500">Đang tải…</p>
        ) : suggestions.length > 0 ? (
          suggestions.map((row) => {
            const username = String(row?.username ?? "").trim();
            const displayName = String(row?.displayName ?? "").trim();
            const avatarUrl = String(row?.avatarUrl ?? "").trim();
            return (
              <button
                key={row.id ?? username}
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(username);
                }}
              >
                <img
                  src={avatarUrl || DEFAULT_AVATAR}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover bg-zinc-800"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {displayName || username}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    @{username}
                  </span>
                </span>
                {friendKeys.has(username.toLowerCase()) ? (
                  <span className="shrink-0 text-[10px] font-semibold text-[#69C9D0]">
                    Bạn bè
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <p className="px-3 py-3 text-xs leading-relaxed text-zinc-500">
            {effectiveQuery
              ? "Không có kết quả"
              : "Gõ tên người dùng sau @ trong ô bình luận"}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * @ / emoji accessory for comment composers (TikTok-style mention popup above input).
 */
export const CommentInputAccessoryButtons = forwardRef(
  function CommentInputAccessoryButtons(
    {
      inputRef,
      draft,
      setDraft,
      token,
      size = "md",
      className = "absolute right-1.5 top-1/2 -translate-y-1/2",
      mentionPlacement = "above",
    },
    ref,
  ) {
    const mentionBtnRef = useRef(null);
    const emojiBtnRef = useRef(null);
    const mentionPopoverRef = useRef(null);
    const emojiPopoverRef = useRef(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionReplaceStart, setMentionReplaceStart] = useState(null);

    const syncMentionFromInput = useCallback(
      (text, caret) => {
        if (!token) return;
        const mention = findMentionAtCaret(text, caret);
        if (mention) {
          setEmojiOpen(false);
          setMentionOpen(true);
          setMentionQuery(mention.query);
          setMentionReplaceStart(mention.replaceStart);
          return;
        }
        setMentionOpen(false);
        setMentionQuery("");
        setMentionReplaceStart(null);
      },
      [token],
    );

    useImperativeHandle(
      ref,
      () => ({
        syncMentionFromInput,
      }),
      [syncMentionFromInput],
    );

    const insertAtCursor = useCallback(
      (text) => {
        const el = inputRef?.current;
        if (!el || typeof setDraft !== "function") {
          setDraft?.((prev) => `${prev ?? ""}${text}`);
          return null;
        }
        const start = el.selectionStart ?? String(draft ?? "").length;
        const end = el.selectionEnd ?? String(draft ?? "").length;
        const source = String(draft ?? "");
        const next = `${source.slice(0, start)}${text}${source.slice(end)}`;
        setDraft(next);
        const caret = start + text.length;
        queueMicrotask(() => {
          el.focus();
          el.setSelectionRange(caret, caret);
        });
        return { start, end: start + text.length, caret };
      },
      [draft, inputRef, setDraft],
    );

    const insertMentionUser = useCallback(
      (username) => {
        const clean = String(username ?? "")
          .trim()
          .replace(/^@/, "");
        if (!clean) return;
        const el = inputRef?.current;
        const source = String(draft ?? "");
        let start = mentionReplaceStart ?? el?.selectionStart ?? source.length;
        let end = el?.selectionStart ?? source.length;
        if (source[start] === "@") {
          const tail = source.slice(start);
          const match = tail.match(/^@[a-zA-Z0-9._]*/);
          end = start + (match?.[0]?.length ?? 1);
        }
        const next = `${source.slice(0, start)}@${clean} ${source.slice(end)}`;
        setDraft(next);
        setMentionOpen(false);
        setMentionQuery("");
        setMentionReplaceStart(null);
        const caret = start + clean.length + 2;
        queueMicrotask(() => {
          el?.focus();
          el?.setSelectionRange(caret, caret);
        });
      },
      [draft, inputRef, mentionReplaceStart, setDraft],
    );

    const openMentionPicker = useCallback(() => {
      if (!token) return;
      setEmojiOpen(false);
      const el = inputRef?.current;
      const caret = el?.selectionStart ?? String(draft ?? "").length;
      const source = String(draft ?? "");
      if (source[caret] !== "@") {
        const result = insertAtCursor("@");
        const nextText = `${source.slice(0, caret)}@${source.slice(el?.selectionEnd ?? caret)}`;
        syncMentionFromInput(nextText, result?.caret ?? caret + 1);
      } else {
        syncMentionFromInput(source, caret + 1);
      }
      queueMicrotask(() => inputRef?.current?.focus());
    }, [draft, inputRef, insertAtCursor, syncMentionFromInput, token]);

    useEffect(() => {
      if (!emojiOpen && !mentionOpen) return;
      const onDown = (e) => {
        const target = e.target;
        if (
          inputRef?.current === target ||
          inputRef?.current?.contains?.(target) ||
          mentionBtnRef.current?.contains(target) ||
          emojiBtnRef.current?.contains(target) ||
          mentionPopoverRef.current?.contains(target) ||
          emojiPopoverRef.current?.contains(target)
        ) {
          return;
        }
        setEmojiOpen(false);
        setMentionOpen(false);
        setMentionQuery("");
        setMentionReplaceStart(null);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [emojiOpen, inputRef, mentionOpen]);

    const iconClass = size === "sm" ? "text-[17px]" : "text-xl";
    const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const atText = size === "sm" ? "text-[15px]" : "text-base";

    return (
      <>
        <div className={`flex items-center gap-0.5 ${className}`}>
          <div className="group/mention relative flex items-center">
            <button
              ref={mentionBtnRef}
              type="button"
              tabIndex={-1}
              disabled={!token}
              className={`${BTN_BASE} ${btnSize} font-bold leading-none ${atText} ${
                mentionOpen ? "bg-white/10 text-white" : ""
              }`}
              aria-label="Nhắc tên"
              aria-expanded={mentionOpen}
              onClick={openMentionPicker}
            >
              @
            </button>
            {!mentionOpen ? (
              <div
                role="tooltip"
                className={`${TIP_CLASSES} w-[min(220px,calc(100vw-2rem))] group-hover/mention:opacity-100`}
              >
                Dùng ký hiệu &quot;@&quot; để gắn thẻ một người dùng trong bình luận của
                bạn
              </div>
            ) : null}
          </div>
          <div className="group/emoji relative flex items-center">
            <button
              ref={emojiBtnRef}
              type="button"
              tabIndex={-1}
              className={`${BTN_BASE} ${btnSize} ${
                emojiOpen ? "bg-white/10 text-white" : ""
              }`}
              aria-label="Chèn biểu tượng cảm xúc"
              aria-expanded={emojiOpen}
              onClick={() => {
                setMentionOpen(false);
                setMentionQuery("");
                setMentionReplaceStart(null);
                setEmojiOpen((open) => !open);
              }}
            >
              <IoHappyOutline className={iconClass} aria-hidden />
            </button>
            {!emojiOpen ? (
              <div
                role="tooltip"
                className={`${TIP_CLASSES} whitespace-nowrap group-hover/emoji:opacity-100`}
              >
                Nhấp để thêm emoji
              </div>
            ) : null}
          </div>
        </div>

        <CommentAccessoryPopover
          anchorRef={inputRef}
          open={mentionOpen}
          popoverRef={mentionPopoverRef}
          width={300}
          maxHeight={280}
          placement={mentionPlacement}
        >
          <CommentMentionPicker
            token={token}
            open={mentionOpen}
            filterQuery={mentionQuery}
            onPick={insertMentionUser}
          />
        </CommentAccessoryPopover>

        <CommentAccessoryPopover
          anchorRef={emojiBtnRef}
          open={emojiOpen}
          popoverRef={emojiPopoverRef}
          width={280}
          maxHeight={220}
        >
          <div className="scrollbar-none grid max-h-[220px] grid-cols-7 gap-0.5 overflow-y-auto overscroll-contain p-2">
            {COMMENT_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-xl transition hover:bg-white/10"
                onClick={() => {
                  insertAtCursor(em);
                  setEmojiOpen(false);
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </CommentAccessoryPopover>
      </>
    );
  },
);
