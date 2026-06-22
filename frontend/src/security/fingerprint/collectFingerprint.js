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

async function detectBrowserName() {
  try {
    if (navigator.brave && (await navigator.brave.isBrave())) {
      return "Brave";
    }
  } catch {
    // Ignore browser detection failures; the backend can still parse User-Agent.
  }
  const brands = navigator.userAgentData?.brands || navigator.userAgentData?.fullVersionList || [];
  const brandNames = brands.map((item) => item.brand).filter(Boolean);
  const knownBrand = brandNames.find((brand) =>
    /Brave|Microsoft Edge|Google Chrome|Chromium|Opera|Vivaldi|CocCoc|Firefox|Safari/i.test(brand),
  );
  if (knownBrand) {
    return knownBrand
      .replace(/Microsoft Edge/i, "Edge")
      .replace(/Google Chrome/i, "Chrome")
      .replace(/CocCoc/i, "Cốc Cốc");
  }
  return "";
}

export async function collectFingerprint() {
  const nav = navigator;
  const screenInfo = window.screen || {};

  return {
    browserName: await detectBrowserName(),
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
