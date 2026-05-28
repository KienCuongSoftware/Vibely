import React, { useEffect, useRef, useState } from "react";

const SIZE = 280;

export function RotateCaptcha({
  outerRingBase64,
  innerDiscBase64,
  imageBase64,
  onRotationChange,
  onRelease,
}) {
  const canvasRef = useRef(null);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const layered = Boolean(outerRingBase64 && innerDiscBase64);

  useEffect(() => {
    setRotation(0);
  }, [outerRingBase64, innerDiscBase64, imageBase64]);

  useEffect(() => {
    if (layered) {
      const outer = new Image();
      const inner = new Image();
      let loaded = 0;
      const onLoad = () => {
        loaded += 1;
        if (loaded < 2) return;
        outerRef.current = outer;
        innerRef.current = inner;
        drawLayered(rotation);
      };
      outer.crossOrigin = "anonymous";
      inner.crossOrigin = "anonymous";
      outer.onload = onLoad;
      inner.onload = onLoad;
      outer.src = outerRingBase64;
      inner.src = innerDiscBase64;
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      outerRef.current = img;
      innerRef.current = null;
      drawLegacy(rotation);
    };
    img.src = imageBase64;
  }, [imageBase64, innerDiscBase64, layered, outerRingBase64]);

  useEffect(() => {
    if (layered) {
      drawLayered(rotation);
    } else {
      drawLegacy(rotation);
    }
    onRotationChange?.(rotation);
  }, [rotation, layered]);

  function drawLayered(angle) {
    const canvas = canvasRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!canvas || !outer || !inner) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(outer, 0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(inner, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.restore();
  }

  function drawLegacy(angle) {
    const canvas = canvasRef.current;
    const img = outerRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const innerRadius = 98;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="mx-auto block rounded-full bg-zinc-900"
        aria-label="Rotate captcha puzzle"
      />
      <input
        type="range"
        min={0}
        max={360}
        value={rotation}
        onChange={(e) => setRotation(Number(e.target.value))}
        onPointerUp={() => onRelease?.()}
        onTouchEnd={() => onRelease?.()}
        className="w-full accent-red-500"
        aria-label="Kéo thanh trượt để ghép hình"
      />
    </div>
  );
}
