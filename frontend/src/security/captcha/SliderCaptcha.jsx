import React, { useEffect, useState } from "react";

const PIECE_CANVAS = 64;
const PIECE_PAD = 6;

export function SliderCaptcha({
  challengeKey,
  backgroundBase64,
  puzzleBase64,
  sliderMax = 260,
  puzzleY = 30,
  onOffsetChange,
  onRelease,
  onBehaviorSample,
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
    onOffsetChange?.(0);
  }, [challengeKey, backgroundBase64, puzzleBase64]);

  if (!backgroundBase64 || !puzzleBase64) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400">
        Không tải được hình captcha, vui lòng làm mới.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950"
        style={{ width: 320, height: 180 }}
      >
        <img
          src={backgroundBase64}
          alt=""
          className="block h-full w-full object-cover"
          draggable={false}
        />
        <img
          src={puzzleBase64}
          alt=""
          draggable={false}
          className="pointer-events-none absolute z-10 drop-shadow-lg"
          style={{
            left: offset - PIECE_PAD,
            top: puzzleY - PIECE_PAD,
            width: PIECE_CANVAS,
            height: PIECE_CANVAS,
          }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={sliderMax}
        value={offset}
        onChange={(e) => {
          const value = Number(e.target.value);
          setOffset(value);
          onOffsetChange?.(value);
          onBehaviorSample?.({
            timestampMs: Date.now(),
            x: value,
            y: puzzleY,
            eventType: "slider",
          });
        }}
        onPointerUp={() => onRelease?.()}
        onTouchEnd={() => onRelease?.()}
        className="w-full accent-red-500"
        aria-label="Kéo mảnh ghép vào đúng vị trí"
      />
    </div>
  );
}
