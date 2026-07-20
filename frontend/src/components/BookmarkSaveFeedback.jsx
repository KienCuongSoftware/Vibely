import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IoArrowBack,
  IoCheckmark,
  IoCheckmarkCircle,
  IoClose,
} from "react-icons/io5";
import { IoBookmarkOutline } from "react-icons/io5";
import { apiClient } from "../api/client";

const COLLECTION_NAME_MAX = 30;

function CollectionPickMedia({ item }) {
  const url = String(item?.videoUrl ?? "").trim();
  const thumb = String(item?.thumbnailUrl ?? "").trim();
  if (url) {
    return (
      <video
        src={url}
        poster={thumb || undefined}
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
        preload="metadata"
      />
    );
  }
  if (thumb) {
    return <img src={thumb} alt="" className="h-full w-full object-cover" />;
  }
  return <div className="h-full w-full bg-zinc-800" />;
}

export function NewCollectionModal({
  open,
  onClose,
  token,
  initialPickVideoId = null,
}) {
  const [step, setStep] = useState("form");
  const [draftName, setDraftName] = useState("");
  const [draftPublic, setDraftPublic] = useState(false);
  const [pickIds, setPickIds] = useState(() => new Set());
  const [bookmarkItems, setBookmarkItems] = useState([]);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const reset = useCallback(() => {
    setStep("form");
    setDraftName("");
    setDraftPublic(false);
    setPickIds(new Set());
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !token) {
      setBookmarkItems([]);
      return undefined;
    }
    let cancelled = false;
    setBookmarkLoading(true);
    apiClient
      .getMyBookmarkedVideos(token, { page: 0, size: 48 })
      .then((data) => {
        if (!cancelled) {
          setBookmarkItems(Array.isArray(data?.items) ? data.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) setBookmarkItems([]);
      })
      .finally(() => {
        if (!cancelled) setBookmarkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    reset();
    if (initialPickVideoId != null) {
      setPickIds(new Set([initialPickVideoId]));
    }
  }, [open, initialPickVideoId, reset]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex max-h-[min(560px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex shrink-0 items-center justify-center border-b border-zinc-800 px-4 py-3">
          {step === "pick" ? (
            <button
              type="button"
              aria-label="Quay lại"
              className="absolute left-2 cursor-pointer rounded-full p-2 text-zinc-200 hover:bg-zinc-800"
              onClick={() => setStep("form")}
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
          ) : null}
          <h2 className="text-center text-lg font-semibold text-zinc-100">
            {step === "form" ? "Bộ sưu tập mới" : "Chọn video"}
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            className="absolute right-2 cursor-pointer rounded-full p-2 text-zinc-200 hover:bg-zinc-800"
            onClick={handleClose}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        {step === "form" ? (
          <div className="flex flex-col gap-4 px-4 pb-5 pt-3">
            <div>
              <label
                htmlFor="new-collection-name"
                className="text-sm font-medium text-zinc-100"
              >
                Tên ({Math.min(draftName.length, COLLECTION_NAME_MAX)}/
                {COLLECTION_NAME_MAX})
              </label>
              <input
                id="new-collection-name"
                type="text"
                maxLength={COLLECTION_NAME_MAX}
                value={draftName}
                onChange={(e) =>
                  setDraftName(e.target.value.slice(0, COLLECTION_NAME_MAX))
                }
                placeholder="Nhập tên bộ sưu tập"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-zinc-800/80 pt-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">
                  Đặt ở chế độ công khai
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Những bộ sưu tập ở chế độ công khai sẽ hiển thị trên hồ sơ
                  của bạn và có thể được chia sẻ với bạn bè.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draftPublic}
                onClick={() => setDraftPublic((p) => !p)}
                className={`relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  draftPublic ? "bg-rose-600" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    draftPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <button
              type="button"
              disabled={!draftName.trim() || bookmarkLoading}
              onClick={() => setStep("pick")}
              className="mt-1 w-full rounded-xl py-3 text-sm font-semibold text-white transition enabled:cursor-pointer enabled:bg-[#FE2C55] enabled:hover:bg-[#f02850] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Tiếp
            </button>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-1 flex-col">
            {bookmarkLoading ? (
              <p className="flex flex-1 items-center justify-center py-12 text-sm text-zinc-500">
                Đang tải…
              </p>
            ) : bookmarkItems.length === 0 ? (
              <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
                <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
                  <IoBookmarkOutline
                    className="mb-4 h-24 w-24 shrink-0 text-zinc-100"
                    aria-hidden
                  />
                  <p className="text-lg font-semibold text-zinc-100">
                    Không có video yêu thích để thêm vào
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-zinc-400">
                    Toàn bộ video yêu thích của bạn hiện đã có trong bộ sưu
                    tập.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full cursor-pointer rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                >
                  Xong
                </button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
                <ul className="grid max-h-[min(360px,45vh)] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {bookmarkItems.map((v) => {
                    const selected = pickIds.has(v.publicId);
                    return (
                      <li key={v.publicId}>
                        <button
                          type="button"
                          onClick={() =>
                            setPickIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(v.publicId)) next.delete(v.publicId);
                              else next.add(v.publicId);
                              return next;
                            })
                          }
                          className="relative block w-full cursor-pointer text-left"
                        >
                          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-950 ring-1 ring-zinc-700">
                            <CollectionPickMedia item={v} />
                            <span
                              className={`absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                selected
                                  ? "border-white bg-rose-600 text-white"
                                  : "border-white/90 bg-black/45"
                              }`}
                            >
                              {selected ? (
                                <IoCheckmark className="text-xs" aria-hidden />
                              ) : null}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full cursor-pointer rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                >
                  Xong
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BookmarkSaveToast({ open, onManage, onDismiss }) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => onDismiss?.(), 4500);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="status"
      className="pointer-events-auto absolute bottom-24 left-1/2 z-[80] flex w-[min(92%,360px)] -translate-x-1/2 items-center gap-2 rounded-lg bg-[#545454]/95 px-3 py-2.5 text-sm text-white shadow-lg backdrop-blur-sm sm:bottom-28"
    >
      <IoCheckmarkCircle className="shrink-0 text-xl text-white" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">
        Đã thêm vào Mục yêu thích
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onManage?.();
        }}
        className="relative z-10 shrink-0 cursor-pointer font-semibold text-[#20d5ec] hover:underline"
      >
        Quản lý ›
      </button>
    </div>
  );
}

const POPOVER_WIDTH = 280;
const POPOVER_ESTIMATED_HEIGHT = 128;

function clampPopoverPosition(anchorRect, popoverWidth, popoverHeight) {
  const gap = 10;
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.left - popoverWidth - gap;
  if (left < margin) {
    left = anchorRect.right + gap;
  }
  left = Math.max(margin, Math.min(left, vw - popoverWidth - margin));

  let top = anchorRect.top - 8;
  top = Math.max(margin, Math.min(top, vh - popoverHeight - margin));
  return { top, left };
}

export function BookmarkCollectionPopover({
  open,
  anchorRef,
  onCreateCollection,
  onClose,
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT;
    const width = popoverRef.current?.offsetWidth ?? POPOVER_WIDTH;
    setPos(clampPopoverPosition(rect, width, height));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    updatePosition();
  }, [open, anchorRef, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (popoverRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose?.();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[125] w-[min(280px,calc(100vw-24px))] rounded-xl border border-white/10 bg-[#545454]/95 p-3 shadow-2xl backdrop-blur-md"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        type="button"
        onClick={onCreateCollection}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-white/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700/80 text-xl text-zinc-100">
          +
        </span>
        <span className="text-sm font-semibold text-zinc-100">
          Tạo bộ sưu tập mới
        </span>
      </button>
      <p className="px-2 py-3 text-center text-sm text-zinc-400">
        Chưa có bộ sưu tập nào được tạo
      </p>
    </div>
  );
}
