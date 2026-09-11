/** Hide the HTML boot splash once the app shell is ready. */
export function dismissBootSplash() {
  const el = document.getElementById("vibely-boot-splash");
  if (!el || el.dataset.dismissed === "1") return;
  el.dataset.dismissed = "1";

  const minMs = 420;
  const wait = Math.max(0, minMs - performance.now());

  window.setTimeout(() => {
    el.classList.add("is-done");
    window.setTimeout(() => {
      el.remove();
    }, 280);
  }, wait);
}
