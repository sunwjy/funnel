import { createGA4Plugin, createMetaPixelPlugin, Funnel } from "@sunwjy/funnel-client";
import type { LogEntry } from "./debug-plugin";
import { createDebugPlugin } from "./debug-plugin";
import { injectPlatformScripts } from "./platform-scripts";

// Real IDs from env, or placeholder values for demo mode.
const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID || "G-XXXXXXXXXX";
const metaPixelId = import.meta.env.VITE_META_PIXEL_ID || "0000000000";

// Inject gtag.js / fbq only when real IDs are present.
// Without injection, platform plugins will no-op silently (window guard in the plugin).
const hasRealGA4 = Boolean(import.meta.env.VITE_GA4_MEASUREMENT_ID);
const hasRealMeta = Boolean(import.meta.env.VITE_META_PIXEL_ID);
injectPlatformScripts(hasRealGA4 ? ga4Id : undefined, hasRealMeta ? metaPixelId : undefined);

/** Subscribers to new log entries — updated by main.ts via addLogListener. */
const logListeners: Array<(entry: LogEntry) => void> = [];

/** Register a callback to receive debug log entries. */
export function addLogListener(cb: (entry: LogEntry) => void): void {
  logListeners.push(cb);
}

const debugPlugin = createDebugPlugin((entry) => {
  for (const cb of logListeners) {
    cb(entry);
  }
});

/** Shared Funnel instance used throughout the example. */
export const funnel = new Funnel({
  plugins: [
    createGA4Plugin({ measurementId: ga4Id }),
    createMetaPixelPlugin({ pixelId: metaPixelId }),
    debugPlugin,
  ],
});

// Initialize all plugins (GA4, Meta Pixel, debug).
funnel.initialize();
