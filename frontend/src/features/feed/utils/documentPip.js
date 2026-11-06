/**
 * Document Picture-in-Picture helpers (Chrome/Edge).
 * Native video PiP cannot host custom TikTok-style chrome.
 */

export function isDocumentPipSupported() {
  return (
    typeof window !== "undefined" &&
    "documentPictureInPicture" in window &&
    typeof window.documentPictureInPicture?.requestWindow === "function"
  );
}

/** Copy link/style tags so Tailwind classes work inside the PiP document. */
export function copyStylesToPipDocument(pipDocument) {
  if (!pipDocument?.head) return;
  const selector = 'link[rel="stylesheet"], style';
  window.document.head.querySelectorAll(selector).forEach((node) => {
    pipDocument.head.appendChild(node.cloneNode(true));
  });
  pipDocument.documentElement.className =
    window.document.documentElement.className;
  pipDocument.body.className =
    "m-0 overflow-hidden bg-black text-white antialiased";
  pipDocument.body.style.margin = "0";
  pipDocument.body.style.overflow = "hidden";
  pipDocument.body.style.background = "#000";
}

/**
 * @param {{ width?: number, height?: number }} [size]
 * @returns {Promise<Window>}
 */
export async function openDocumentPipWindow({
  width = 320,
  height = 568,
} = {}) {
  if (!isDocumentPipSupported()) {
    throw new Error("document-pip-unsupported");
  }
  const pipWindow = await window.documentPictureInPicture.requestWindow({
    width,
    height,
  });
  copyStylesToPipDocument(pipWindow.document);
  return pipWindow;
}
