/**
 * Browser-to-server transport for plugins that POST event payloads.
 *
 * Prefers `navigator.sendBeacon` (reliable on page unload) and falls back
 * to `fetch` with `keepalive: true` when sendBeacon is unavailable or its
 * queue is full. Errors are swallowed — analytics must never throw.
 *
 * Internal — not part of the public client API.
 *
 * @internal
 */

export function postJson(url: string, body: string): void {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }
  if (typeof fetch === "function") {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // analytics must never throw
    });
  }
}
