/**
 * Clip dọc (videoHeight > videoWidth) nhưng nội dung ngang bị letterbox (vd Snaptik):
 * quét luma theo cột dọc giữa khung để ước chiều cao vùng không-phải-đen.
 * Trả về có nên coi là "ngang" cho layout feed (cột rộng) hay không.
 * Canvas có thể bị taint (CORS) — khi đó trả về false, im lặng.
 */
export function detectLetterboxedLandscapeLayout(videoEl, options = {}) {
  const blackLuma = options.blackLuma ?? 32
  const minRowFillRatio = options.minRowFillRatio ?? 0.045
  const maxContentHeightRatio = options.maxContentHeightRatio ?? 0.74
  const minEffectiveAspect = options.minEffectiveAspect ?? 1.28

  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight
  if (!vw || !vh || vw >= vh) {
    return false
  }

  const targetH = Math.min(128, vh)
  const tw = Math.max(8, Math.round((vw * targetH) / vh))
  const th = targetH

  let canvas
  let ctx
  try {
    canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false
    ctx.drawImage(videoEl, 0, 0, vw, vh, 0, 0, tw, th)
  } catch {
    return false
  }

  let imageData
  try {
    imageData = ctx.getImageData(0, 0, tw, th)
  } catch {
    return false
  }

  const data = imageData.data
  const stride = tw * 4

  const isBrightPixel = (px) => {
    const r = data[px]
    const g = data[px + 1]
    const b = data[px + 2]
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return y > blackLuma
  }

  const col0 = Math.floor(tw * 0.22)
  const col1 = Math.ceil(tw * 0.78)
  const minBrightInRow = Math.max(2, Math.floor((col1 - col0) * minRowFillRatio))

  let top = 0
  for (let y = 0; y < th; y++) {
    let bright = 0
    const row = y * stride
    for (let x = col0; x < col1; x++) {
      if (isBrightPixel(row + x * 4)) bright++
      if (bright >= minBrightInRow) break
    }
    if (bright >= minBrightInRow) {
      top = y
      break
    }
  }

  let bottom = th - 1
  for (let y = th - 1; y >= 0; y--) {
    let bright = 0
    const row = y * stride
    for (let x = col0; x < col1; x++) {
      if (isBrightPixel(row + x * 4)) bright++
      if (bright >= minBrightInRow) break
    }
    if (bright >= minBrightInRow) {
      bottom = y
      break
    }
  }

  const contentH = bottom - top + 1
  if (contentH < 8 || contentH >= th * 0.92) {
    return false
  }

  const contentHeightRatio = contentH / th
  if (contentHeightRatio > maxContentHeightRatio) {
    return false
  }

  const effectiveAspect = vw / (contentH * (vh / th))
  return effectiveAspect >= minEffectiveAspect
}
