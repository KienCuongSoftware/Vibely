export function detectAutomation() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const win = typeof window !== "undefined" ? window : {};

  const webdriver = Boolean(nav.webdriver);
  const seleniumGlobals =
    Boolean(win.__webdriver_script_fn) ||
    Boolean(win.__selenium_unwrapped) ||
    Boolean(win.__driver_evaluate) ||
    Boolean(win.__webdriver_evaluate);
  const puppeteerTrace =
    Boolean(nav.userAgent?.includes("HeadlessChrome")) ||
    Boolean(win.chrome && !win.chrome.runtime);
  const playwrightTrace = Boolean(win.__playwright);
  const headlessHints =
    /HeadlessChrome/i.test(nav.userAgent || "") ||
    nav.plugins?.length === 0;

  let suspiciousWebGl = false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        suspiciousWebGl = /swiftshader|llvmpipe/i.test(String(renderer));
      }
    }
  } catch {
    suspiciousWebGl = false;
  }

  return {
    webdriver,
    headlessHints,
    seleniumGlobals,
    puppeteerTrace,
    playwrightTrace,
    suspiciousWebGl,
    timingVariance: measureTimingVariance(),
  };
}

function measureTimingVariance() {
  const samples = [];
  for (let i = 0; i < 8; i++) {
    const start = performance.now();
    // Tiny workload to measure jitter.
    for (let j = 0; j < 500; j++) {
      Math.sqrt(j + i);
    }
    samples.push(performance.now() - start);
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
  return Math.min(1, Math.sqrt(variance) / Math.max(mean, 0.001));
}
