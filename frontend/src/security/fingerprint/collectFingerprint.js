function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function canvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 10, 120, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("vibely-ab", 12, 12);
    return hashString(canvas.toDataURL());
  } catch {
    return "";
  }
}

function webglRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "";
  } catch {
    return "";
  }
}

export async function collectFingerprint() {
  const nav = navigator;
  const screenInfo = window.screen || {};

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: screenInfo.width,
    screenHeight: screenInfo.height,
    colorDepth: screenInfo.colorDepth,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    canvasHash: canvasFingerprint(),
    webglRenderer: webglRenderer(),
    audioHash: "",
    fonts: [],
  };
}
