import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n.js";
import {
  IoAdd,
  IoArrowBack,
  IoBatteryFullOutline,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoTextOutline,
} from "react-icons/io5";
import { LuWifi } from "react-icons/lu";
import { uploadThumbnailToStorage } from "@/shared/api/client";
import { DEFAULT_AVATAR_URL } from "@/features/profile/utils/avatarUrl.js";
import {
  THUMBNAIL_MAX_WIDTH,
  canvasToJpegBlob,
  drawVideoFrameToCanvas,
} from "@/features/post/utils/videoThumbnail.js";

/** Thumb trên dải ~ mỗi 2s (chỉ hiển thị). Vuốt chọn thời gian liên tục trên cả video. */
const FILMSTRIP_THUMB_INTERVAL_SEC = 2;
const FILMSTRIP_MAX_THUMBS = 150;
const SCRUB_STEP_SEC = 0.1;
/** Filmstrip capture — sharp enough for small thumbs + interim large preview. */
const FILMSTRIP_CAPTURE_WIDTH = 480;
const FILMSTRIP_JPEG_QUALITY = 0.9;
/** Thumb dọc 9:16 trên dải chọn khung (giống TikTok). */
const FILMSTRIP_FRAME_HEIGHT = 56;
const FILMSTRIP_FRAME_WIDTH = Math.round((FILMSTRIP_FRAME_HEIGHT * 9) / 16);
/** Khung chọn cao hơn thumb — padding shell tránh bị clip. */
const FILMSTRIP_SELECTOR_OVERSHOOT = 6;

function formatFilmstripTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function filmstripThumbCount(durationSec) {
  const d = Math.max(0.08, Number(durationSec) || 1);
  return Math.max(
    2,
    Math.min(
      FILMSTRIP_MAX_THUMBS,
      Math.floor(d / FILMSTRIP_THUMB_INTERVAL_SEC) + 1,
    ),
  );
}

function clampSelectedTime(t, duration) {
  const maxT = Math.max(0, (Number(duration) || 0) - 0.04);
  return Math.min(maxT, Math.max(0, Number(t) || 0));
}

function readFilmstripTimeFromScroll(container, duration) {
  if (!container || duration <= 0) return 0;
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  if (maxScroll <= 0) return 0;
  const progress = Math.min(1, Math.max(0, container.scrollLeft / maxScroll));
  return clampSelectedTime(progress * Math.max(0.01, duration - 0.04), duration);
}

function scrollFilmstripToTime(container, time, duration, behavior = "auto") {
  if (!container || duration <= 0) return;
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  if (maxScroll <= 0) return;
  const maxT = Math.max(0.01, duration - 0.04);
  const progress = clampSelectedTime(time, duration) / maxT;
  const left = progress * maxScroll;
  if (behavior === "smooth" && typeof container.scrollTo === "function") {
    container.scrollTo({ left, behavior: "smooth" });
  } else {
    container.scrollLeft = left;
  }
}

/** Pad phải đủ để khung cuối kéo vào dưới selector (mép trái). */
function filmstripEndPadPx(containerWidth) {
  return Math.max(0, (Number(containerWidth) || 0) - FILMSTRIP_FRAME_WIDTH);
}

function nearestFilmstripFrame(frames, time) {
  if (!frames?.length) return null;
  let best = frames[0];
  let bestDist = Math.abs(Number(best.time) - time);
  for (let i = 1; i < frames.length; i += 1) {
    const dist = Math.abs(Number(frames[i].time) - time);
    if (dist < bestDist) {
      best = frames[i];
      bestDist = dist;
    }
  }
  return best;
}

function previewTimeCacheKey(time) {
  return (Math.round((Number(time) || 0) * 20) / 20).toFixed(2);
}
/** Large modal preview capture (display is smaller; keep retina-sharp). */
const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_JPEG_QUALITY = 0.96;
/** Final cover upload quality. */
const COVER_EXPORT_JPEG_QUALITY = 0.97;
const COVER_EXPORT_MAX_WIDTH = Math.max(THUMBNAIL_MAX_WIDTH, 1440);

const COVER_PREVIEW_FALLBACK_NAME = "Vibely";

/** Stickers: gallery = PNG mẫu. Canvas = widget HTML (đổi chữ vẫn giữ icon/khung). */
const COVER_STICKERS = [
  {
    id: "note-white",
    src: "/images/text-preview/4c79db00-268d-48e2-b9fe-7c3b7bc2707d.png",
    defaultText: "Text",
    styleKey: "noteWhite",
  },
  {
    id: "badge-dark",
    src: "/images/text-preview/7f474bee-88ce-461c-a347-843cea4145f4.png",
    defaultText: "Text",
    styleKey: "badgeDark",
  },
  {
    id: "frame-glitch",
    src: "/images/text-preview/41dd55c0-fe15-47dd-b954-fd9ca564ee68.png",
    defaultText: "Text",
    styleKey: "frameGlitch",
  },
  {
    id: "box-cyan",
    src: "/images/text-preview/565d8583-44a3-477d-95e1-25a681de7d89.png",
    defaultText: "Text",
    styleKey: "boxCyan",
  },
  {
    id: "pink-glitch",
    src: "/images/text-preview/8105a2c6-de42-4a3b-8dc7-86ba50be90b1.png",
    defaultText: "Text",
    styleKey: "pinkGlitch",
  },
  {
    id: "pink-sticker",
    src: "/images/text-preview/a2f22926-b7ce-4170-bd54-0835a000cfb2.png",
    defaultText: "Text",
    styleKey: "pinkSticker",
  },
  {
    id: "yellow-outline",
    src: "/images/text-preview/bf540eca-2aa4-4fb2-a0c3-324cf115c51c.png",
    defaultText: "Text",
    styleKey: "yellowOutline",
  },
  {
    id: "bubble-teal",
    src: "/images/text-preview/a9ab0427-53f6-4f35-9755-08facadb1286.png",
    defaultText: "Text",
    styleKey: "bubbleTeal",
  },
  {
    id: "window-stack",
    src: "/images/text-preview/d3569db3-e6b1-4995-8d64-b2282aecdcab.png",
    defaultText: "Text",
    styleKey: "windowStack",
  },
  {
    id: "pill-lavender",
    src: "/images/text-preview/e6bd373d-b3f5-45fb-944d-1fa4d1b07add.png",
    defaultText: "Text",
    styleKey: "pillLavender",
  },
];

const DEFAULT_STICKER_WIDTH_PCT = 42;
/** Căn giữa stage + snap khi kéo sticker (TikTok-style). */
const STAGE_CENTER_PCT = 50;
const STAGE_ALIGN_SNAP_PCT = 1.4;

function snapStagePosition(xPct, yPct) {
  let x = xPct;
  let y = yPct;
  let verticalGuide = false;
  let horizontalGuide = false;
  if (Math.abs(x - STAGE_CENTER_PCT) <= STAGE_ALIGN_SNAP_PCT) {
    x = STAGE_CENTER_PCT;
    verticalGuide = true;
  }
  if (Math.abs(y - STAGE_CENTER_PCT) <= STAGE_ALIGN_SNAP_PCT) {
    y = STAGE_CENTER_PCT;
    horizontalGuide = true;
  }
  return { xPct: x, yPct: y, verticalGuide, horizontalGuide };
}

/** Nốt nhạc kiểu TikTok (trắng + lệch cyan/magenta). */
function MusicNoteIcon({ className = "h-[1em] w-[1em]" }) {
  const d = "M11.2 2.4v9.35a3.35 3.35 0 1 0 1.85 3.05V6.1h4.55V2.4H11.2z";
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d={d} fill="#fe2c55" transform="translate(1.1 0.6)" />
      <path d={d} fill="#00f2ea" transform="translate(-1.1 -0.55)" />
      <path d={d} fill="#fff" />
    </svg>
  );
}

/** Widget sticker — bám layout/màu ảnh mẫu text-preview. */
function StickerBody({
  styleKey,
  text,
  editing,
  interactive,
  textRef,
  onTextInput,
  onTextBlur,
  onTextKeyDown,
  onTextPointerDown,
  frameClassName = "",
  frameChildren = null,
}) {
  const editable = Boolean(interactive && editing);
  const label = text || "Text";
  const textNode = (
    <span
      ref={interactive ? textRef : undefined}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      className="relative z-[1] outline-none whitespace-nowrap"
      onPointerDown={onTextPointerDown}
      onInput={onTextInput}
      onBlur={onTextBlur}
      onKeyDown={onTextKeyDown}
    >
      {editable ? null : label}
    </span>
  );

  /**
   * Container ngoài giữ bề rộng wPct (cơ sở cho cỡ chữ theo cqw); lớp trong ôm sát
   * nội dung thật (shrink-0 + w-max) để khung chọn luôn bọc hết chữ.
   */
  const shell = (children, extra = "") => (
    <div className={`@container flex w-full justify-center ${extra}`}>
      <div className={`relative w-max shrink-0 ${frameClassName}`}>
        {children}
        {frameChildren}
      </div>
    </div>
  );

  switch (styleKey) {
    case "noteWhite":
      return shell(
        <div className="relative w-max max-w-full pt-[0.85em] pl-[0.15em] text-[max(7px,16cqw)]">
          <div className="absolute left-0 top-0 z-10 -skew-x-[14deg] rounded-[0.22em] border-[0.14em] border-white bg-black px-[0.28em] py-[0.22em]">
            <span className="flex skew-x-[14deg] items-center justify-center">
              <MusicNoteIcon className="h-[0.95em] w-[0.95em]" />
            </span>
          </div>
          <div className="inline-flex max-w-full -skew-x-[14deg] items-center rounded-[0.28em] bg-white px-[0.78em] py-[0.4em] font-extrabold leading-none text-black">
            <span className="skew-x-[14deg]">{textNode}</span>
          </div>
        </div>,
      );

    case "badgeDark":
      return shell(
        <div className="relative flex w-max max-w-full items-center text-[max(7px,15cqw)]">
          <div className="relative z-10 flex h-[2.35em] w-[2.35em] shrink-0 items-center justify-center rounded-full border-[0.14em] border-white bg-black">
            <span
              className="pointer-events-none absolute inset-[0.18em] rounded-full"
              style={{
                background:
                  "conic-gradient(from 200deg, #fe2c55 0deg 95deg, #00f2ea 95deg 360deg)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 0.12em), #000 calc(100% - 0.11em))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 0.12em), #000 calc(100% - 0.11em))",
              }}
            />
            <MusicNoteIcon className="relative h-[1.15em] w-[1.15em]" />
          </div>
          <div className="relative -ml-[0.55em] flex min-h-[1.85em] max-w-full items-center border-[0.14em] border-l-0 border-white bg-black py-[0.32em] pl-[0.72em] pr-[0.95em] [border-radius:0_0.55em_0.55em_0]">
            <span className="pointer-events-none absolute right-0 top-0 h-[0.42em] w-[0.55em] border-b-[0.14em] border-l-[0.14em] border-white bg-black" />
            <span className="pointer-events-none absolute right-[0.42em] top-0 h-[0.28em] w-[0.42em] border-b-[0.14em] border-l-[0.14em] border-white bg-black" />
            <span className="pointer-events-none absolute inset-x-[0.55em] top-[0.16em] h-[0.1em] rounded-full bg-[#00f2ea]" />
            <span className="pointer-events-none absolute inset-x-[0.55em] bottom-[0.16em] h-[0.1em] rounded-full bg-[#fe2c55]" />
            <span className="font-extrabold leading-none tracking-tight text-white">
              {textNode}
            </span>
          </div>
        </div>,
      );

    case "frameGlitch":
      return shell(
        <div className="relative w-max max-w-full p-[0.32em] text-[max(7px,16cqw)]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#00f2ea]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, calc(100% - 0.32em) 0.32em, 0.32em 0.32em, 0.32em calc(100% - 0.32em), 0 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#fe2c55]"
            style={{
              clipPath:
                "polygon(100% 0, 100% 100%, 0 100%, 0.32em calc(100% - 0.32em), calc(100% - 0.32em) calc(100% - 0.32em), calc(100% - 0.32em) 0.32em)",
            }}
          />
          <div className="relative inline-flex items-center bg-black px-[0.7em] py-[0.4em] font-extrabold leading-none tracking-tight text-white">
            {textNode}
          </div>
        </div>,
      );

    case "boxCyan":
      return shell(
        <div className="relative w-max max-w-full p-[0.28em] text-[max(7px,16cqw)]">
          <div className="pointer-events-none absolute inset-0 grid grid-rows-2">
            <div className="bg-[#00c2e6]" />
            <div className="grid grid-cols-[1.1fr_0.9fr]">
              <div className="bg-[#161722]" />
              <div className="bg-[#fe2c55]" />
            </div>
          </div>
          <div className="relative inline-flex items-center bg-white px-[0.72em] py-[0.4em] font-extrabold leading-none tracking-tight text-black">
            {textNode}
          </div>
        </div>,
      );

    case "pinkGlitch":
      return shell(
        <div className="relative w-max max-w-full px-[0.55em] pb-[0.55em] pt-[0.28em] text-[max(7px,16cqw)]">
          <div
            className="relative inline-flex items-center bg-[#ff2d55] px-[0.75em] py-[0.42em] font-extrabold leading-none tracking-tight text-white"
            style={{
              clipPath:
                "polygon(0 12%, 6% 12%, 6% 0, 82% 0, 82% 8%, 90% 8%, 90% 0, 100% 0, 100% 62%, 94% 62%, 94% 78%, 100% 78%, 100% 100%, 18% 100%, 18% 92%, 0 92%)",
            }}
          >
            {textNode}
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[0.35em] left-[0.15em] h-[1.15em] w-[1.35em] border-b-[0.14em] border-l-[0.14em] border-white"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[0.12em] left-[0.2em] h-[0.32em] w-[0.85em]"
            style={{
              background:
                "linear-gradient(135deg, transparent 40%, #fff 40% 50%, transparent 50% 60%, #fff 60% 70%, transparent 70% 80%, #fff 80% 90%, transparent 90%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[0.18em] top-1/2 h-[1.35em] w-[0.14em] -translate-y-1/2 bg-white"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[0.85em] font-black leading-none text-white"
          >
            +
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute left-[0.55em] top-1/2 h-[0.18em] w-[0.18em] -translate-y-1/2 rounded-full bg-white"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[0.7em] top-[0.1em] h-[0.28em] w-[0.28em] bg-white"
          />
        </div>,
      );

    case "pinkSticker":
      return shell(
        <div
          className="inline-flex w-max max-w-full items-center italic text-[max(8px,24cqw)] font-black leading-none tracking-tight text-[#ff2d55]"
          style={{
            WebkitTextStroke: "0.09em #fff",
            paintOrder: "stroke fill",
            filter: "drop-shadow(0.1em 0.14em 0 #111)",
          }}
        >
          {textNode}
        </div>,
      );

    case "yellowOutline":
      return shell(
        <div
          className="inline-flex w-max max-w-full -rotate-[12deg] items-center text-[max(8px,24cqw)] font-black leading-none tracking-tighter text-[#fde01a]"
          style={{
            WebkitTextStroke: "0.14em #12121d",
            paintOrder: "stroke fill",
          }}
        >
          {textNode}
        </div>,
      );

    case "bubbleTeal":
      return shell(
        <div className="relative w-max max-w-full pb-[0.5em] text-[max(7px,16cqw)]">
          <div className="relative inline-flex items-center rounded-[1.05em] border-[0.22em] border-white bg-[#54b8a0] px-[0.85em] py-[0.48em] font-extrabold leading-none tracking-tight text-white">
            {textNode}
            <svg
              aria-hidden
              className="pointer-events-none absolute left-[42%] top-full -mt-[0.08em] h-[0.7em] w-[0.95em] -translate-x-1/2 overflow-visible"
              viewBox="0 0 40 28"
            >
              <path
                d="M8 2h10c4 0 8 4 10 10 1.2 3.6 2 9 2 14-6-6-12-9-18-10C7.5 15 4 12 2 8 4 4 6 2 8 2z"
                fill="#54b8a0"
                stroke="#fff"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>,
      );

    case "windowStack":
      return shell(
        <div className="relative w-max max-w-full pb-[0.45em] pl-[0.45em] text-[max(7px,15cqw)]">
          <div className="pointer-events-none absolute bottom-0 left-0 h-[calc(100%-0.22em)] w-[calc(100%-0.22em)] overflow-hidden rounded-[0.18em] border-[0.12em] border-[#3d5bff] bg-white">
            <div className="h-[0.55em] bg-gradient-to-b from-[#6b8cff] to-[#3d5bff]" />
          </div>
          <div className="pointer-events-none absolute bottom-[0.12em] left-[0.12em] h-[calc(100%-0.22em)] w-[calc(100%-0.22em)] overflow-hidden rounded-[0.18em] border-[0.12em] border-[#3d5bff] bg-white">
            <div className="h-[0.55em] bg-gradient-to-b from-[#6b8cff] to-[#3d5bff]" />
          </div>
          <div className="relative inline-flex min-w-[3.8em] flex-col overflow-hidden rounded-[0.18em] border-[0.12em] border-[#3d5bff] bg-white font-extrabold leading-none text-[#3d5bff]">
            <div className="flex h-[0.7em] items-center justify-between bg-gradient-to-b from-[#6b8cff] to-[#3d5bff] px-[0.28em]">
              <span className="flex items-center gap-[0.18em]">
                <span className="h-[0.22em] w-[0.22em] rounded-full bg-white" />
                <span className="h-[0.2em] w-[0.2em] bg-white" />
                <span className="h-0 w-0 border-l-[0.12em] border-r-[0.12em] border-b-[0.2em] border-l-transparent border-r-transparent border-b-white" />
              </span>
              <span className="flex flex-col gap-[0.08em]">
                <span className="h-[0.06em] w-[0.55em] bg-white/90" />
                <span className="h-[0.06em] w-[0.55em] bg-white/90" />
                <span className="h-[0.06em] w-[0.55em] bg-white/90" />
              </span>
            </div>
            <div className="flex items-center justify-center px-[0.7em] py-[0.45em]">
              {textNode}
            </div>
          </div>
        </div>,
      );

    case "pillLavender":
      return shell(
        <div className="relative w-max max-w-full pt-[0.55em] pr-[0.35em] text-[max(7px,16cqw)]">
          <div className="inline-flex items-center rounded-full bg-[#9397f4] px-[0.95em] py-[0.45em] font-extrabold leading-none tracking-tight text-white">
            {textNode}
          </div>
          <div className="absolute right-0 top-0 flex h-[1.35em] w-[1.35em] items-center justify-center rounded-full border-[0.1em] border-white bg-black">
            <MusicNoteIcon className="h-[0.78em] w-[0.78em]" />
          </div>
        </div>,
      );

    default:
      return shell(
        <div className="inline-flex w-max max-w-full items-center text-[max(8px,22cqw)] font-extrabold leading-none text-white [text-shadow:0.05em_0.05em_0.1em_rgba(0,0,0,.85)]">
          {textNode}
        </div>,
      );
  }
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(i18n.t("upload.cover.loadImageFailed")));
    img.src = src;
  });
}

/** Vẽ sticker chữ (+ icon/khung) lên canvas export. */
async function drawTextStickerOnCanvas(ctx, sticker, canvasW, canvasH) {
  const text = String(sticker.text ?? "Text").trim() || "Text";
  const wPct = Math.min(
    90,
    Math.max(12, Number(sticker.wPct) || DEFAULT_STICKER_WIDTH_PCT),
  );
  const maxW = (wPct / 100) * canvasW;
  const cx = ((Number(sticker.xPct) || 50) / 100) * canvasW;
  const cy = ((Number(sticker.yPct) || 50) / 100) * canvasH;
  const styleKey = sticker.styleKey || "bubbleTeal";
  const fontSize = Math.max(18, Math.round(maxW * 0.2));
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;

  const padX = fontSize * 0.55;
  const padY = fontSize * 0.4;
  const metrics = ctx.measureText(text);
  const textW = Math.min(maxW - padX * 2, metrics.width);
  const boxW = Math.min(maxW, textW + padX * 2);
  const boxH = fontSize + padY * 2;
  const x0 = cx - boxW / 2;
  const y0 = cy - boxH / 2;

  const roundRect = (x, y, w, h, radius) => {
    const rr = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const drawMusicNote = (cxN, cyN, size) => {
    const s = size / 24;
    ctx.save();
    ctx.translate(cxN - size / 2, cyN - size / 2);
    ctx.scale(s, s);
    const path = new Path2D(
      "M11.2 2.4v9.35a3.35 3.35 0 1 0 1.85 3.05V6.1h4.55V2.4H11.2z",
    );
    ctx.fillStyle = "#fe2c55";
    ctx.translate(1.1, 0.6);
    ctx.fill(path);
    ctx.translate(-1.1, -0.6);
    ctx.fillStyle = "#00f2ea";
    ctx.translate(-1.1, -0.55);
    ctx.fill(path);
    ctx.translate(1.1, 0.55);
    ctx.fillStyle = "#fff";
    ctx.fill(path);
    ctx.restore();
  };

  const drawNoteCircle = (centerX, centerY, size) => {
    const r = size / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    // cyan/magenta ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, r * 0.82, -Math.PI * 0.15, Math.PI * 1.1);
    ctx.strokeStyle = "#00f2ea";
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, r * 0.82, Math.PI * 0.85, Math.PI * 1.85);
    ctx.strokeStyle = "#fe2c55";
    ctx.stroke();
    drawMusicNote(centerX, centerY, size * 0.55);
  };

  switch (styleKey) {
    case "badgeDark": {
      const iconSize = boxH * 1.2;
      const overlap = iconSize * 0.22;
      const barW = boxW;
      const barH = boxH * 0.92;
      const totalW = iconSize + barW - overlap;
      const startX = cx - totalW / 2;
      const iconCx = startX + iconSize / 2;
      const barX = startX + iconSize - overlap;
      const barY = cy - barH / 2;
      ctx.fillStyle = "#000";
      roundRect(barX, barY, barW, barH, barH / 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(2, fontSize * 0.08);
      ctx.stroke();
      ctx.fillStyle = "#00f2ea";
      roundRect(
        barX + barW * 0.12,
        barY + barH * 0.12,
        barW * 0.7,
        Math.max(2, barH * 0.08),
        99,
      );
      ctx.fill();
      ctx.fillStyle = "#fe2c55";
      roundRect(
        barX + barW * 0.12,
        barY + barH * 0.8,
        barW * 0.7,
        Math.max(2, barH * 0.08),
        99,
      );
      ctx.fill();
      drawNoteCircle(iconCx, cy, iconSize);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, barX + barW * 0.55, cy);
      ctx.restore();
      return;
    }
    case "noteWhite": {
      const iconSize = fontSize * 1.05;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1, 0, -0.25, 1, 0, 0);
      ctx.fillStyle = "#fff";
      roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#000";
      ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillText(text, cx, cy);
      // icon box
      const ix = x0 + iconSize * 0.15;
      const iy = y0 - iconSize * 0.35;
      ctx.save();
      ctx.translate(ix + iconSize / 2, iy + iconSize / 2);
      ctx.transform(1, 0, -0.25, 1, 0, 0);
      ctx.fillStyle = "#000";
      roundRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(2, fontSize * 0.08);
      ctx.stroke();
      ctx.restore();
      drawMusicNote(ix + iconSize / 2, iy + iconSize / 2, iconSize * 0.55);
      ctx.restore();
      return;
    }
    case "frameGlitch":
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(x0, y0, boxW, boxH);
      ctx.strokeStyle = "#00f2ea";
      ctx.lineWidth = Math.max(3, fontSize * 0.1);
      ctx.strokeRect(x0, y0, boxW, boxH);
      ctx.strokeStyle = "#fe2c55";
      ctx.beginPath();
      ctx.moveTo(x0 + boxW, y0);
      ctx.lineTo(x0 + boxW, y0 + boxH);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      break;
    case "boxCyan":
      ctx.fillStyle = "#fff";
      roundRect(x0, y0, boxW, boxH, 4);
      ctx.fill();
      ctx.strokeStyle = "#00c8e0";
      ctx.lineWidth = Math.max(4, fontSize * 0.12);
      ctx.stroke();
      ctx.fillStyle = "#000";
      break;
    case "pinkGlitch":
      ctx.fillStyle = "#fff";
      ctx.fillRect(x0 + 5, y0 + 5, boxW, boxH);
      ctx.fillStyle = "#111";
      ctx.fillRect(x0 - 4, y0 - 4, boxW, boxH);
      ctx.fillStyle = "#ff2d55";
      ctx.fillRect(x0, y0, boxW, boxH);
      ctx.fillStyle = "#fff";
      break;
    case "pinkSticker":
      ctx.lineWidth = Math.max(4, fontSize * 0.14);
      ctx.strokeStyle = "#fff";
      ctx.strokeText(text, cx, cy);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = Math.max(2, fontSize * 0.06);
      ctx.strokeText(text, cx + 2, cy + 3);
      ctx.fillStyle = "#ff2d55";
      ctx.fillText(text, cx, cy);
      ctx.restore();
      return;
    case "yellowOutline":
      ctx.translate(cx, cy);
      ctx.rotate((-6 * Math.PI) / 180);
      ctx.lineWidth = Math.max(5, fontSize * 0.16);
      ctx.strokeStyle = "#111";
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = "#ffe600";
      ctx.fillText(text, 0, 0);
      ctx.restore();
      return;
    case "bubbleTeal":
      ctx.fillStyle = "#54b8a0";
      roundRect(x0, y0, boxW, boxH, 18);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(5, fontSize * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 + boxW * 0.22, y0 + boxH);
      ctx.lineTo(x0 + boxW * 0.22 + 10, y0 + boxH + 12);
      ctx.lineTo(x0 + boxW * 0.22 + 20, y0 + boxH);
      ctx.closePath();
      ctx.fillStyle = "#54b8a0";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      break;
    case "windowStack":
      ctx.fillStyle = "#5b6cff";
      ctx.fillRect(x0 + 10, y0 - 10, boxW, boxH);
      ctx.fillRect(x0 + 5, y0 - 5, boxW, boxH);
      ctx.fillStyle = "#fff";
      roundRect(x0, y0, boxW, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = "#5b6cff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#5b6cff";
      ctx.fillRect(x0, y0, boxW, boxH * 0.22);
      ctx.fillStyle = "#3d4fd8";
      break;
    case "pillLavender": {
      ctx.fillStyle = "#838cef";
      roundRect(x0, y0, boxW, boxH, boxH / 2);
      ctx.fill();
      drawNoteCircle(x0 + boxW - boxH * 0.15, y0, boxH * 0.75);
      ctx.fillStyle = "#fff";
      break;
    }
    default:
      ctx.fillStyle = "#fff";
      break;
  }

  ctx.fillText(text, cx, cy);
  ctx.restore();
}

async function compositeCoverWithSticker(baseBlob, sticker) {
  if (!sticker) return baseBlob;
  const baseUrl = URL.createObjectURL(baseBlob);
  try {
    const baseImg = await loadHtmlImage(baseUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, baseImg.naturalWidth || baseImg.width);
    canvas.height = Math.max(1, baseImg.naturalHeight || baseImg.height);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
    await drawTextStickerOnCanvas(ctx, sticker, canvas.width, canvas.height);
    return canvasToJpegBlob(canvas, COVER_EXPORT_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(baseUrl);
  }
}

function waitSeeked(video) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
  });
}

/** @param {File | string} source File cục bộ hoặc URL phát video (không tải cả file trước). */
function createVideoFromSource(source) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  let cleanup = () => {};
  if (source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    video.src = objectUrl;
    cleanup = () => URL.revokeObjectURL(objectUrl);
  } else {
    video.crossOrigin = "anonymous";
    video.src = String(source);
  }
  return { video, cleanup };
}

async function loadVideoMetadata(
  video,
  errorMessage = i18n.t("upload.cover.loadVideoFailed"),
) {
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error(errorMessage));
  });
}

async function extractVideoFilmstrip(videoSource) {
  const { video, cleanup } = createVideoFromSource(videoSource);
  await loadVideoMetadata(video);
  const duration = Math.max(0.08, Number(video.duration) || 1);
  const frameCount = filmstripThumbCount(duration);
  const canvas = document.createElement("canvas");
  const vw = video.videoWidth || 360;
  const vh = video.videoHeight || 640;
  const aspect = vh / Math.max(1, vw);
  canvas.width = FILMSTRIP_CAPTURE_WIDTH;
  canvas.height = Math.max(1, Math.round(FILMSTRIP_CAPTURE_WIDTH * aspect));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const frames = [];
  const n = Math.max(1, frameCount);
  for (let i = 0; i < n; i++) {
    const t =
      n <= 1
        ? duration / 2
        : (i / (n - 1)) * Math.max(0.01, duration - 0.06) + 0.02;
    video.currentTime = Math.min(t, duration - 0.04);
    await waitSeeked(video);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      time: t,
      dataUrl: canvas.toDataURL("image/jpeg", FILMSTRIP_JPEG_QUALITY),
    });
  }
  cleanup();
  return { frames, duration };
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Preview lớn trong modal — trích theo thời điểm, trả về object URL. */
async function extractPreviewFrame(
  videoSource,
  timeSeconds,
  maxWidth = PREVIEW_MAX_WIDTH,
) {
  const { video, cleanup } = createVideoFromSource(videoSource);
  await loadVideoMetadata(video, i18n.t("upload.cover.loadVideoPreviewFailed"));

  const duration = Math.max(0.08, Number(video.duration) || 1);
  const t = Math.max(0, Math.min(Number(timeSeconds || 0), duration - 0.04));
  video.currentTime = t;
  await waitSeeked(video);

  const vw = Math.max(1, video.videoWidth || 1080);
  const vh = Math.max(1, video.videoHeight || 1920);
  const targetW = Math.min(maxWidth, vw);
  const targetH = Math.max(1, Math.round(targetW * (vh / vw)));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, 0, 0, targetW, targetH);

  const blob = await canvasToJpegBlob(canvas, PREVIEW_JPEG_QUALITY);

  cleanup();
  return URL.createObjectURL(blob);
}

async function extractOriginalResolutionFrame(videoSource, timeSeconds) {
  const { video, cleanup } = createVideoFromSource(videoSource);
  await loadVideoMetadata(video, i18n.t("upload.cover.loadVideoExtractFailed"));

  const duration = Math.max(0.08, Number(video.duration) || 1);
  const t = Math.max(0, Math.min(Number(timeSeconds || 0), duration - 0.04));
  video.currentTime = t;
  await waitSeeked(video);

  const canvas = document.createElement("canvas");
  drawVideoFrameToCanvas(video, canvas, COVER_EXPORT_MAX_WIDTH);

  const blob = await canvasToJpegBlob(canvas, COVER_EXPORT_JPEG_QUALITY);

  cleanup();
  return blob;
}

/**
 * Modal chỉnh ảnh bìa kiểu TikTok Studio: Sticker/Text | canvas | preview hồ sơ.
 */
export function CoverPickerModal({
  open,
  onClose,
  videoFile,
  videoUrl,
  token,
  onConfirm,
  profileDisplayName,
  profileAvatarUrl,
}) {
  const { t } = useTranslation();

  const videoSource = videoFile ?? (String(videoUrl ?? "").trim() || null);
  const previewProfileName =
    String(profileDisplayName ?? "").trim() || COVER_PREVIEW_FALLBACK_NAME;
  const previewProfileAvatar =
    String(profileAvatarUrl ?? "").trim() || DEFAULT_AVATAR_URL;
  /** @type {['video' | 'upload', Function]} */
  const [tab, setTab] = useState("video");
  const [toolTab, setToolTab] = useState("sticker");
  const [frames, setFrames] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedTime, setSelectedTime] = useState(0);
  const [stripLoading, setStripLoading] = useState(false);
  const [stripError, setStripError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [displayPreviewUrl, setDisplayPreviewUrl] = useState("");
  const [scale, setScale] = useState(1);
  /** @type {[null | { id: string, styleKey: string, text: string, xPct: number, yPct: number, wPct: number }, Function]} */
  const [activeSticker, setActiveSticker] = useState(null);
  const [stickerSelected, setStickerSelected] = useState(true);
  const [stickerEditing, setStickerEditing] = useState(false);
  const stickerTextRef = useRef(null);
  const previewCacheRef = useRef(new Map());
  const selectedTimeRef = useRef(0);
  const coverImageInputRef = useRef(null);
  const filmstripRef = useRef(null);
  const filmstripTrackRef = useRef(null);
  const filmstripDragRef = useRef(null);
  const filmstripProgrammaticRef = useRef(false);
  const filmstripScrollEndRef = useRef(null);
  const filmstripTimeHideRef = useRef(null);
  const canvasStageRef = useRef(null);
  const stickerDragRef = useRef(null);
  const [alignGuides, setAlignGuides] = useState({
    vertical: false,
    horizontal: false,
  });
  const [filmstripTimeVisible, setFilmstripTimeVisible] = useState(false);
  const [filmstripEndPad, setFilmstripEndPad] = useState(0);

  const updateFilmstripEndPad = useCallback(() => {
    const outer = filmstripRef.current;
    if (!outer) return;
    const next = filmstripEndPadPx(outer.clientWidth);
    setFilmstripEndPad((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);

  const showFilmstripTime = useCallback(() => {
    setFilmstripTimeVisible(true);
    if (filmstripTimeHideRef.current) {
      window.clearTimeout(filmstripTimeHideRef.current);
      filmstripTimeHideRef.current = null;
    }
  }, []);

  const scheduleHideFilmstripTime = useCallback((delayMs = 500) => {
    if (filmstripTimeHideRef.current) {
      window.clearTimeout(filmstripTimeHideRef.current);
    }
    filmstripTimeHideRef.current = window.setTimeout(() => {
      setFilmstripTimeVisible(false);
      filmstripTimeHideRef.current = null;
    }, delayMs);
  }, []);

  const scrollFilmstripToSelectedTime = useCallback(
    (time, behavior = "auto") => {
      const outer = filmstripRef.current;
      if (!outer || videoDuration <= 0) return;
      filmstripProgrammaticRef.current = true;
      scrollFilmstripToTime(outer, time, videoDuration, behavior);
      window.setTimeout(
        () => {
          filmstripProgrammaticRef.current = false;
        },
        behavior === "smooth" ? 320 : 0,
      );
    },
    [videoDuration],
  );

  const applyFilmstripScrollSelection = useCallback(() => {
    const outer = filmstripRef.current;
    if (!outer || !frames.length || filmstripProgrammaticRef.current) {
      return;
    }
    const nextTime = readFilmstripTimeFromScroll(outer, videoDuration);
    if (Math.abs(nextTime - selectedTimeRef.current) > 0.001) {
      setTab("video");
      setSelectedTime(nextTime);
      selectedTimeRef.current = nextTime;
    }
  }, [frames.length, videoDuration]);

  const handleFilmstripScroll = useCallback(() => {
    showFilmstripTime();
    applyFilmstripScrollSelection();
    if (filmstripScrollEndRef.current) {
      window.clearTimeout(filmstripScrollEndRef.current);
    }
    filmstripScrollEndRef.current = window.setTimeout(() => {
      scheduleHideFilmstripTime();
    }, 140);
  }, [
    applyFilmstripScrollSelection,
    scheduleHideFilmstripTime,
    showFilmstripTime,
  ]);

  const selectFilmstripFrameAtClientX = useCallback(
    (clientX) => {
      const outer = filmstripRef.current;
      if (!outer || !frames.length || videoDuration <= 0) return;
      const xOnTrack = outer.scrollLeft + (clientX - outer.getBoundingClientRect().left);
      const index = Math.max(
        0,
        Math.min(
          frames.length - 1,
          Math.floor(xOnTrack / FILMSTRIP_FRAME_WIDTH),
        ),
      );
      const frame = frames[index];
      if (!frame) return;
      const nextTime = clampSelectedTime(Number(frame.time) || 0, videoDuration);
      setTab("video");
      setSelectedTime(nextTime);
      selectedTimeRef.current = nextTime;
      filmstripProgrammaticRef.current = true;
      if (typeof outer.scrollTo === "function") {
        outer.scrollTo({
          left: index * FILMSTRIP_FRAME_WIDTH,
          behavior: "smooth",
        });
      } else {
        outer.scrollLeft = index * FILMSTRIP_FRAME_WIDTH;
      }
      window.setTimeout(() => {
        filmstripProgrammaticRef.current = false;
      }, 320);
      showFilmstripTime();
      scheduleHideFilmstripTime();
    },
    [
      frames,
      scheduleHideFilmstripTime,
      showFilmstripTime,
      videoDuration,
    ],
  );

  const onFilmstripPointerDown = useCallback(
    (e) => {
      if (e.button !== 0 || !frames.length) return;
      const outer = filmstripRef.current;
      if (!outer) return;
      filmstripDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startScrollLeft: outer.scrollLeft,
        moved: false,
      };
      outer.setPointerCapture(e.pointerId);
      setTab("video");
      showFilmstripTime();
    },
    [frames.length, showFilmstripTime],
  );

  const onFilmstripPointerMove = useCallback(
    (e) => {
      const drag = filmstripDragRef.current;
      const outer = filmstripRef.current;
      if (!drag || !outer || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (!drag.moved) return;
      outer.scrollLeft = drag.startScrollLeft - dx;
      showFilmstripTime();
      applyFilmstripScrollSelection();
    },
    [applyFilmstripScrollSelection, showFilmstripTime],
  );

  const onFilmstripPointerUp = useCallback(
    (e) => {
      const drag = filmstripDragRef.current;
      const outer = filmstripRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const wasClick = !drag.moved && Math.abs(e.clientX - drag.startX) <= 6;
      filmstripDragRef.current = null;
      if (filmstripScrollEndRef.current) {
        window.clearTimeout(filmstripScrollEndRef.current);
        filmstripScrollEndRef.current = null;
      }
      if (outer?.hasPointerCapture(e.pointerId)) {
        outer.releasePointerCapture(e.pointerId);
      }
      if (wasClick) {
        selectFilmstripFrameAtClientX(e.clientX);
        return;
      }
      applyFilmstripScrollSelection();
      scheduleHideFilmstripTime();
    },
    [
      applyFilmstripScrollSelection,
      scheduleHideFilmstripTime,
      selectFilmstripFrameAtClientX,
    ],
  );

  const stepFilmstripSelection = useCallback(
    (direction) => {
      if (!frames.length || videoDuration <= 0) return;
      setTab("video");
      showFilmstripTime();
      const next = clampSelectedTime(
        selectedTimeRef.current + direction * SCRUB_STEP_SEC,
        videoDuration,
      );
      setSelectedTime(next);
      selectedTimeRef.current = next;
      scrollFilmstripToSelectedTime(next, "auto");
      scheduleHideFilmstripTime();
    },
    [
      frames.length,
      scheduleHideFilmstripTime,
      scrollFilmstripToSelectedTime,
      showFilmstripTime,
      videoDuration,
    ],
  );

  useEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  useEffect(() => {
    if (!open) return;
    setTab("video");
    setToolTab("sticker");
    setSelectedTime(0);
    selectedTimeRef.current = 0;
    setVideoDuration(0);
    setFrames([]);
    setStripError("");
    setUploadFile(null);
    setError("");
    setScale(1);
    setActiveSticker(null);
    setStickerSelected(true);
    setStickerEditing(false);
    setDisplayPreviewUrl("");
    setFilmstripTimeVisible(false);
    previewCacheRef.current.forEach((cachedUrl) =>
      URL.revokeObjectURL(cachedUrl),
    );
    previewCacheRef.current.clear();
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "video" || !videoSource || !frames.length) {
      if (tab !== "upload") setDisplayPreviewUrl("");
      return undefined;
    }

    const time = clampSelectedTime(
      selectedTime,
      videoDuration || frames[frames.length - 1]?.time || 1,
    );
    const interim = nearestFilmstripFrame(frames, time);
    const cacheKey = previewTimeCacheKey(time);
    const cached = previewCacheRef.current.get(cacheKey);
    if (cached) {
      setDisplayPreviewUrl(cached);
      return undefined;
    }

    if (interim?.dataUrl) {
      setDisplayPreviewUrl(interim.dataUrl);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      extractPreviewFrame(videoSource, time)
        .then((objectUrl) => {
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          previewCacheRef.current.set(cacheKey, objectUrl);
          if (previewTimeCacheKey(selectedTimeRef.current) === cacheKey) {
            setDisplayPreviewUrl(objectUrl);
          }
        })
        .catch(() => {
          /* giữ preview filmstrip */
        });
    }, 70);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, tab, videoSource, frames, selectedTime, videoDuration]);

  useEffect(() => {
    if (!open || !videoSource) {
      setFrames([]);
      setVideoDuration(0);
      setStripLoading(false);
      return;
    }
    let cancelled = false;
    setStripLoading(true);
    setStripError("");
    extractVideoFilmstrip(videoSource)
      .then(({ frames: f, duration }) => {
        if (!cancelled) {
          setFrames(f);
          setVideoDuration(duration);
          setSelectedTime(0);
          selectedTimeRef.current = 0;
        }
      })
      .catch((e) => {
        if (!cancelled)
          setStripError(e.message ?? t("upload.cover.extractFramesFailed"));
      })
      .finally(() => {
        if (!cancelled) setStripLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, videoSource, t]);

  useLayoutEffect(() => {
    updateFilmstripEndPad();
    if (!frames.length || videoDuration <= 0) return;
    scrollFilmstripToSelectedTime(selectedTimeRef.current, "auto");
  }, [
    frames,
    videoDuration,
    filmstripEndPad,
    scrollFilmstripToSelectedTime,
    updateFilmstripEndPad,
  ]);

  useEffect(() => {
    const outer = filmstripRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(() => {
      updateFilmstripEndPad();
      if (!filmstripDragRef.current) {
        scrollFilmstripToSelectedTime(selectedTimeRef.current, "auto");
      }
    });
    ro.observe(outer);
    return () => ro.disconnect();
  }, [frames.length, scrollFilmstripToSelectedTime, updateFilmstripEndPad, open]);

  useEffect(() => {
    return () => {
      if (filmstripScrollEndRef.current) {
        window.clearTimeout(filmstripScrollEndRef.current);
      }
      if (filmstripTimeHideRef.current) {
        window.clearTimeout(filmstripTimeHideRef.current);
      }
      previewCacheRef.current.forEach((cachedUrl) =>
        URL.revokeObjectURL(cachedUrl),
      );
      previewCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

  const onPickImageFile = useCallback((file) => {
    if (!file) return;
    const mime = file.type || "";
    if (!mime.startsWith("image/")) {
      setError(t("upload.cover.pickImageFile"));
      return;
    }
    setError("");
    setUploadFile(file);
    setTab("upload");
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, [t]);

  const placeSticker = useCallback((preset) => {
    setToolTab("sticker");
    setStickerSelected(true);
    setStickerEditing(false);
    setActiveSticker((prev) => {
      if (prev?.id === preset.id) return prev;
      return {
        id: preset.id,
        src: preset.src,
        styleKey: preset.styleKey,
        text: preset.defaultText || t("upload.cover.defaultText"),
        xPct: prev?.xPct ?? 50,
        yPct: prev?.yPct ?? 48,
        wPct: prev?.wPct ?? DEFAULT_STICKER_WIDTH_PCT,
      };
    });
  }, [t]);

  const placePlainText = useCallback(() => {
    setToolTab("text");
    setStickerSelected(true);
    setStickerEditing(true);
    setActiveSticker({
      id: `text-${Date.now()}`,
      src: "",
      styleKey: "plainText",
      text: t("upload.cover.defaultText"),
      xPct: 50,
      yPct: 48,
      wPct: DEFAULT_STICKER_WIDTH_PCT,
    });
  }, [t]);

  const beginEditSticker = useCallback(() => {
    setStickerSelected(true);
    setStickerEditing(true);
  }, []);

  useEffect(() => {
    if (!activeSticker || !stickerSelected || stickerEditing || busy)
      return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable)
        return;
      e.preventDefault();
      setActiveSticker(null);
      setStickerEditing(false);
      setStickerSelected(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSticker, stickerSelected, stickerEditing, busy]);

  useEffect(() => {
    if (!stickerEditing) return undefined;
    const id = window.setTimeout(() => {
      const el = stickerTextRef.current;
      if (!el) return;
      if (!el.textContent) el.textContent = activeSticker?.text || t("upload.cover.defaultText");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 0);
    return () => window.clearTimeout(id);
  }, [stickerEditing, activeSticker?.id, t]);

  const onStickerPointerDown = useCallback(
    (e) => {
      if (!activeSticker || busy || stickerEditing) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.focus?.();
      const stage = canvasStageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const pointerId = e.pointerId;
      e.currentTarget.setPointerCapture?.(pointerId);
      stickerDragRef.current = {
        mode: "move",
        pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: activeSticker.xPct,
        origY: activeSticker.yPct,
        origW: activeSticker.wPct,
        stageW: Math.max(1, rect.width),
        stageH: Math.max(1, rect.height),
      };
      setStickerSelected(true);
    },
    [activeSticker, busy, stickerEditing],
  );

  const onStickerResizePointerDown = useCallback(
    (e) => {
      if (!activeSticker || busy || stickerEditing) return;
      e.preventDefault();
      e.stopPropagation();
      const stage = canvasStageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const pointerId = e.pointerId;
      e.currentTarget.setPointerCapture?.(pointerId);
      stickerDragRef.current = {
        mode: "resize",
        pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: activeSticker.xPct,
        origY: activeSticker.yPct,
        origW: activeSticker.wPct,
        stageW: Math.max(1, rect.width),
        stageH: Math.max(1, rect.height),
      };
      setStickerSelected(true);
    },
    [activeSticker, busy, stickerEditing],
  );

  useEffect(() => {
    const onMove = (e) => {
      const drag = stickerDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.mode === "move") {
        const rawX = Math.min(
          92,
          Math.max(8, drag.origX + (dx / drag.stageW) * 100),
        );
        const rawY = Math.min(
          92,
          Math.max(8, drag.origY + (dy / drag.stageH) * 100),
        );
        const snapped = snapStagePosition(rawX, rawY);
        setAlignGuides({
          vertical: snapped.verticalGuide,
          horizontal: snapped.horizontalGuide,
        });
        setActiveSticker((prev) =>
          prev ? { ...prev, xPct: snapped.xPct, yPct: snapped.yPct } : prev,
        );
        return;
      }
      const delta = (dx / drag.stageW) * 100;
      // Khớp giới hạn của bản export (drawTextStickerOnCanvas).
      const wPct = Math.min(90, Math.max(12, drag.origW + delta));
      setActiveSticker((prev) => (prev ? { ...prev, wPct } : prev));
    };
    const onUp = () => {
      stickerDragRef.current = null;
      setAlignGuides({ vertical: false, horizontal: false });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const handleConfirm = async () => {
    if (!token) {
      setError(t("upload.cover.needLogin"));
      return;
    }
    if (tab === "video") {
      if (stripLoading || !frames.length || videoDuration <= 0) {
        setError(t("upload.cover.noFramesYet"));
        return;
      }
    } else if (!uploadFile) {
      setError(t("upload.cover.pickUploadImage"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      let blob;
      let fname = "cover.jpg";

      if (tab === "video") {
        const time = clampSelectedTime(selectedTime, videoDuration);
        if (videoSource) {
          blob = await extractOriginalResolutionFrame(videoSource, time);
        } else {
          const frame = nearestFilmstripFrame(frames, time);
          blob = await dataUrlToBlob(frame?.dataUrl || frames[0].dataUrl);
          blob = new Blob([blob], { type: "image/jpeg" });
        }
      } else {
        blob = uploadFile;
        fname = uploadFile.name || "cover.jpg";
      }

      if (activeSticker) {
        blob = await compositeCoverWithSticker(blob, activeSticker);
        fname = "cover.jpg";
      }

      let url;
      try {
        url = await uploadThumbnailToStorage(token, blob, fname);
      } catch (uploadErr) {
        setError(
          uploadErr instanceof Error
            ? uploadErr.message
            : t("upload.cover.uploadFailed"),
        );
        return;
      }
      onConfirm(url, blob);
      onClose();
    } catch (e) {
      setError(e.message ?? t("upload.cover.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const previewSrc =
    tab === "video" ? displayPreviewUrl : uploadPreviewUrl || undefined;

  const canUseVideoTab = Boolean(videoSource);
  const hasVideoCover =
    tab === "video" &&
    !stripLoading &&
    !stripError &&
    frames.length > 0 &&
    videoDuration > 0;
  const hasUploadCover = tab === "upload" && Boolean(uploadFile);
  const canConfirm = !busy && (hasVideoCover || hasUploadCover);

  /** Stage: ảnh bìa + sticker widget (đổi chữ vẫn giữ chrome như mẫu). */
  const renderStageLayers = ({ interactive, objectFit = "contain" }) => {
    const imageFitClass =
      objectFit === "cover" ? "object-cover" : "object-contain";
  return (
      <>
        {previewSrc ? (
          <img
            key={previewSrc}
            src={previewSrc}
            alt=""
            className={`absolute inset-0 h-full w-full ${imageFitClass} transition-transform duration-100`}
            style={{ transform: `scale(${scale})` }}
            decoding="async"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 animate-pulse bg-zinc-800"
            aria-hidden
          />
        )}

        {activeSticker ? (
          <div
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? t("upload.cover.stickerAria") : undefined}
            className={`absolute z-10 select-none outline-none ${
              interactive
                ? stickerEditing
                  ? "cursor-text"
                  : stickerSelected
                    ? "cursor-move"
                    : "cursor-pointer"
                : "pointer-events-none"
            } ${interactive && !stickerEditing ? "touch-none" : ""}`}
            style={{
              left: `${activeSticker.xPct}%`,
              top: `${activeSticker.yPct}%`,
              width: `${activeSticker.wPct}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={
              interactive && !stickerEditing ? onStickerPointerDown : undefined
            }
            onFocus={
              interactive ? () => setStickerSelected(true) : undefined
            }
            onDoubleClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    beginEditSticker();
                  }
                : undefined
            }
            onKeyDown={
              interactive
                ? (e) => {
                    if (stickerEditing) return;
                    if (e.key === "Delete" || e.key === "Backspace") {
                      e.preventDefault();
                      setActiveSticker(null);
                      setStickerEditing(false);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      beginEditSticker();
                    }
                  }
                : undefined
            }
          >
            <div className="relative w-full drop-shadow-md">
              <StickerBody
                styleKey={activeSticker.styleKey}
                text={activeSticker.text}
                editing={Boolean(interactive && stickerEditing)}
                interactive={interactive}
                textRef={stickerTextRef}
                frameClassName={
                  interactive && stickerSelected
                    ? "ring-2 ring-[#20d5ec] ring-offset-2 ring-offset-transparent"
                    : ""
                }
                frameChildren={
                  interactive && stickerSelected && !stickerEditing ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                      />
                      <span
                        aria-hidden
                        className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                      />
                      <span
                        aria-hidden
                        className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                      />
                      <span
                        aria-hidden
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-[#20d5ec] bg-white shadow"
                        onPointerDown={onStickerResizePointerDown}
                      />
                    </>
                  ) : null
                }
                onTextPointerDown={
                  interactive && stickerEditing
                    ? (e) => e.stopPropagation()
                    : undefined
                }
                onTextInput={
                  interactive
                    ? (e) => {
                        const next = e.currentTarget.textContent ?? "";
                        setActiveSticker((prev) =>
                          prev ? { ...prev, text: next } : prev,
                        );
                      }
                    : undefined
                }
                onTextBlur={
                  interactive
                    ? (e) => {
                        const next =
                          (e.currentTarget.textContent ?? "").trim() || t("upload.cover.defaultText");
                        e.currentTarget.textContent = next;
                        setActiveSticker((prev) =>
                          prev ? { ...prev, text: next } : prev,
                        );
                        setStickerEditing(false);
                      }
                    : undefined
                }
                onTextKeyDown={
                  interactive && stickerEditing
                    ? (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        e.stopPropagation();
                      }
                    : undefined
                }
              />
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-modal-title"
    >
      <div className="flex h-[min(920px,96vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-xl bg-[#121212] text-zinc-100 shadow-2xl ring-1 ring-white/10">
        {/* Header kiểu TikTok */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-200 hover:bg-white/10"
              onClick={onClose}
              aria-label={t("common.back")}
              disabled={busy}
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <h2
              id="cover-modal-title"
              className="truncate text-base font-bold text-white"
            >
              {t("upload.cover.title")}
          </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-50 sm:px-4"
            onClick={onClose}
              disabled={busy}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-[#fe2c55] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
            >
              {busy ? t("upload.cover.saving") : t("common.save")}
          </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Cột trái: rail dọc Sticker/Text + panel (kiểu TikTok) */}
          <aside className="hidden shrink-0 border-r border-white/10 bg-[#1a1a1a] sm:flex">
            <nav className="flex w-14 shrink-0 flex-col border-r border-white/10 bg-[#121212] py-2">
          <button
            type="button"
                className={`mx-1.5 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-2.5 text-[10px] font-semibold transition ${
                  toolTab === "sticker"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
                onClick={() => setToolTab("sticker")}
                aria-pressed={toolTab === "sticker"}
              >
                <IoHappyOutline className="text-xl" aria-hidden />
                {t("upload.cover.sticker")}
          </button>
          <button
            type="button"
                className={`mx-1.5 mt-1 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-2.5 text-[10px] font-semibold transition ${
                  toolTab === "text"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
                onClick={() => setToolTab("text")}
                aria-pressed={toolTab === "text"}
              >
                <IoTextOutline className="text-xl" aria-hidden />
                {t("upload.cover.text")}
          </button>
            </nav>
            <div className="scrollbar-none flex w-[180px] min-h-0 flex-col overflow-y-auto p-3 xl:w-[200px]">
              {toolTab === "sticker" ? (
                <div className="grid grid-cols-2 gap-2">
                  {COVER_STICKERS.map((preset) => {
                    const selected = activeSticker?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={t("upload.cover.addStickerTitle")}
                        aria-pressed={selected}
                        onClick={() => placeSticker(preset)}
                        className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-black p-1.5 transition ${
                          selected
                            ? "border-[#20d5ec] ring-2 ring-[#20d5ec]/50"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    );
                  })}
        </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {t("upload.cover.textHint")}
                  </p>
                  <button
                    type="button"
                    onClick={placePlainText}
                    className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {t("upload.cover.addText")}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Cột giữa: canvas ngang + scale + filmstrip */}
          <div className="flex min-w-0 flex-1 flex-col bg-[#0a0a0a] vibely-keep-dark">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-3 sm:px-6">
              {!canUseVideoTab && tab === "video" ? (
                <p className="max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                  {t("upload.cover.noVideo")}
                </p>
              ) : stripLoading && tab === "video" ? (
                <p className="text-sm text-zinc-400">
                  {t("upload.cover.generatingFrames")}
                </p>
              ) : stripError && tab === "video" ? (
                <p className="max-w-sm rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-center text-sm text-rose-300">
                  {stripError}
                </p>
              ) : (
                <div className="relative flex max-h-full w-full max-w-[640px] items-center justify-center">
                  {/* Canvas ngang — guide dọc = vùng crop hiện trên preview hồ sơ */}
                  <div
                    ref={canvasStageRef}
                    className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-lg ring-1 ring-white/15"
                    onPointerDown={() => {
                      setStickerSelected(false);
                      setStickerEditing(false);
                    }}
                  >
                    {renderStageLayers({ interactive: true })}

                    {alignGuides.vertical ? (
                      <div
                        className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[2px] -translate-x-1/2 bg-[#39ff14] shadow-[0_0_6px_rgba(57,255,20,0.85)]"
                        aria-hidden
                      />
                    ) : null}
                    {alignGuides.horizontal ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-[2px] -translate-y-1/2 bg-[#39ff14] shadow-[0_0_6px_rgba(57,255,20,0.85)]"
                        aria-hidden
                      />
                    ) : null}

                    <div
                      className="pointer-events-none absolute inset-y-0 left-[18%] w-px bg-white/95"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-[18%] w-px bg-white/95"
                      aria-hidden
                    />
                  </div>
                </div>
                    )}
                  </div>

            {/* Scale */}
            <div className="flex shrink-0 items-center justify-end gap-2 px-4 pb-2 sm:px-6">
              <span className="text-xs font-medium text-zinc-400">{t("upload.cover.scale")}</span>
                    <button
                      type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-400 hover:bg-white/10"
                aria-label={t("upload.cover.zoomOut")}
                onClick={() =>
                  setScale((s) => Math.max(1, Number((s - 0.05).toFixed(2))))
                }
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={2}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-1.5 w-28 cursor-pointer accent-[#20d5ec] sm:w-40"
                aria-label={t("upload.cover.scaleAria")}
              />
              <button
                type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-400 hover:bg-white/10"
                aria-label={t("upload.cover.zoomIn")}
                onClick={() =>
                  setScale((s) => Math.min(2, Number((s + 0.05).toFixed(2))))
                }
              >
                +
              </button>
            </div>

            {/* Filmstrip ngang + Upload cover */}
            <div className="flex shrink-0 items-start gap-2 border-t border-white/10 bg-[#121212] px-2 py-3 sm:gap-3 sm:px-4">
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => onPickImageFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                className={`flex h-14 w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border text-[10px] font-semibold leading-tight transition sm:text-[11px] ${
                  tab === "upload"
                    ? "border-[#20d5ec] bg-[#20d5ec]/10 text-[#20d5ec] ring-1 ring-[#20d5ec]/40"
                    : "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
                }`}
              >
                <IoAdd className="text-xl" aria-hidden />
                {t("upload.cover.uploadCover")}
                    </button>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div
                  className="relative overflow-visible pt-7 pb-2"
                  onMouseEnter={showFilmstripTime}
                  onMouseLeave={() => scheduleHideFilmstripTime(120)}
                >
                  {tab === "video" &&
                  frames.length > 0 &&
                  filmstripTimeVisible ? (
                    <div
                      className="pointer-events-none absolute left-0 top-0 z-30 whitespace-nowrap rounded-md bg-zinc-600/95 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-md transition-opacity duration-150"
                      style={{
                        transform: `translateX(${Math.max(0, (FILMSTRIP_FRAME_WIDTH - 52) / 2)}px)`,
                      }}
                      aria-hidden
                    >
                      {formatFilmstripTime(selectedTime)}
                      <span className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-zinc-600/95" />
                    </div>
                  ) : null}

                  {tab === "video" && frames.length > 0 ? (
                    <div
                      className="pointer-events-none absolute bottom-2 left-0 z-20 rounded-md border-2 border-white shadow-[0_0_0_2px_rgba(32,213,236,0.9)]"
                      style={{
                        width: FILMSTRIP_FRAME_WIDTH,
                        height:
                          FILMSTRIP_FRAME_HEIGHT +
                          FILMSTRIP_SELECTOR_OVERSHOOT * 2,
                      }}
                      aria-hidden
                    />
                  ) : null}

                    <div
                      ref={filmstripRef}
                    role="slider"
                      aria-label={t("upload.cover.filmstripAria")}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, videoDuration)}
                    aria-valuenow={selectedTime}
                    aria-valuetext={formatFilmstripTime(selectedTime)}
                      tabIndex={0}
                    onScroll={handleFilmstripScroll}
                    onPointerDown={onFilmstripPointerDown}
                    onPointerMove={onFilmstripPointerMove}
                    onPointerUp={onFilmstripPointerUp}
                    onPointerCancel={onFilmstripPointerUp}
                      onKeyDown={(e) => {
                      if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        stepFilmstripSelection(-1);
                      } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        stepFilmstripSelection(1);
                      }
                    }}
                    className="h-14 cursor-grab select-none overflow-x-auto overflow-y-visible overscroll-x-contain rounded-md bg-transparent scrollbar-none touch-pan-x active:cursor-grabbing"
                  >
                    <div
                      ref={filmstripTrackRef}
                      className="flex h-full w-max items-center"
                    >
                        {frames.map((f, i) => (
                        <div
                            key={`${f.time}-${i}`}
                          className="h-full shrink-0 cursor-pointer overflow-hidden bg-zinc-900"
                          style={{ width: FILMSTRIP_FRAME_WIDTH }}
                          title={t("upload.cover.selectFrame", { time: formatFilmstripTime(f.time) })}
                          >
                            <img
                              src={f.dataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="eager"
                              decoding="async"
                            draggable={false}
                            />
                        </div>
                        ))}
                      <div
                        aria-hidden
                        className="h-full shrink-0"
                        style={{ width: filmstripEndPad }}
                      />
                      </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 pb-0.5">
                    <button
                      type="button"
                    aria-label={t("upload.cover.stepBack")}
                    aria-disabled={selectedTime <= 0.001}
                    onClick={() => stepFilmstripSelection(-1)}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-600/80 bg-zinc-100/95 text-zinc-700 shadow-sm transition hover:bg-white ${
                      selectedTime <= 0.001 ? "cursor-default opacity-40" : ""
                    }`}
                  >
                    <IoChevronBack className="text-sm" aria-hidden />
                    </button>
              <button
                type="button"
                    aria-label={t("upload.cover.stepForward")}
                    aria-disabled={
                      selectedTime >= Math.max(0, videoDuration - 0.05)
                    }
                    onClick={() => stepFilmstripSelection(1)}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-600/80 bg-zinc-100/95 text-zinc-700 shadow-sm transition hover:bg-white ${
                      selectedTime >= Math.max(0, videoDuration - 0.05)
                        ? "cursor-default opacity-40"
                        : ""
                    }`}
                  >
                    <IoChevronForward className="text-sm" aria-hidden />
              </button>
                </div>
              </div>
            </div>

            {error ? (
              <p className="shrink-0 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                {error}
              </p>
            ) : null}
          </div>

          {/* Cột phải: phone dọc — Preview in profile (9:16) */}
          <aside className="hidden w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#1a1a1a] lg:flex xl:w-[300px]">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-4">
              <div className="flex aspect-9/16 w-[220px] max-h-[min(560px,70vh)] flex-col overflow-hidden rounded-[32px] border border-zinc-700 bg-black shadow-lg ring-1 ring-white/10">
                {/* Status bar + nav — vector (nét mọi DPI), giống UploadPage profile preview */}
                <div className="flex shrink-0 flex-col bg-black">
                  <div className="flex items-center justify-between px-3 pt-2 pb-0.5 text-[11px] font-semibold tabular-nums text-white">
                    <span>8:00</span>
                    <div
                      className="flex items-center gap-1.5 text-white"
                      aria-hidden
                    >
                      <div className="flex items-end gap-px pb-0.5">
                        <span className="h-1 w-[3px] rounded-[1px] bg-white" />
                        <span className="h-1.5 w-[3px] rounded-[1px] bg-white" />
                        <span className="h-2 w-[3px] rounded-[1px] bg-white" />
                        <span className="h-2.5 w-[3px] rounded-[1px] bg-white" />
                      </div>
                      <LuWifi className="text-[15px]" strokeWidth={2.25} />
                      <IoBatteryFullOutline className="text-[17px]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
                    <IoChevronBack
                      className="text-2xl text-white"
                      aria-hidden
                    />
                    <IoEllipsisHorizontal
                      className="text-xl text-white"
                      aria-hidden
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center px-3 pb-3 pt-1">
                  <img
                    src={previewProfileAvatar}
                    alt=""
                    className="h-[72px] w-[72px] rounded-full bg-zinc-800 object-cover ring-1 ring-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <p className="mt-2.5 max-w-full truncate px-1 text-center text-[15px] font-bold text-white">
                    {previewProfileName}
                  </p>
                  <div className="mt-3 flex w-full items-stretch justify-center gap-0 text-center">
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">{t("upload.cover.following")}</p>
                </div>
                    <div
                      className="w-px self-stretch bg-zinc-700"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">{t("upload.cover.followers")}</p>
                    </div>
                    <div
                      className="w-px self-stretch bg-zinc-700"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">{t("upload.cover.likes")}</p>
                    </div>
                  </div>
        </div>

                {/* Lưới video dọc 9:16 — giống trang hồ sơ thật */}
                <div className="min-h-0 flex-1 overflow-hidden bg-black">
                  <div className="grid grid-cols-3 gap-px border-t border-zinc-800 bg-zinc-900">
                    <div className="relative aspect-9/16 overflow-hidden bg-black">
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <div className="relative aspect-video h-full w-auto max-w-none">
                          {renderStageLayers({
                            interactive: false,
                            objectFit: "cover",
                          })}
        </div>
      </div>
    </div>
                    <div className="aspect-9/16 bg-zinc-950" />
                    <div className="aspect-9/16 bg-zinc-950" />
                    <div className="aspect-9/16 bg-zinc-950" />
                    <div className="aspect-9/16 bg-zinc-950" />
                    <div className="aspect-9/16 bg-zinc-950" />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-400">
                {t("upload.cover.previewInProfile")}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
