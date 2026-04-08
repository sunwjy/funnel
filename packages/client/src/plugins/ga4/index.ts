/**
 * `@funnel/plugin-ga4` — Google Analytics 4 plugin.
 *
 * @remarks
 * Since GA4 is the base event format, events are passed through without transformation.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin } from "@funnel/core";

declare global {
  interface Window {
    /** Google Analytics gtag function. */
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Configuration for the GA4 plugin.
 */
export interface GA4PluginConfig {
  /** GA4 Measurement ID (e.g., "G-XXXXXXXXXX"). */
  measurementId?: string;
}

/**
 * Creates a GA4 plugin instance.
 *
 * @remarks
 * Sends events to Google Analytics 4 via `window.gtag`.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns A GA4 {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createGA4Plugin } from "@funnel/plugin-ga4";
 *
 * const funnel = new Funnel({
 *   plugins: [createGA4Plugin()],
 * });
 *
 * funnel.initialize({
 *   ga4: { measurementId: "G-XXXXXXXXXX" },
 * });
 * ```
 */
export function createGA4Plugin(): FunnelPlugin {
  return {
    name: "ga4",

    initialize(config: Record<string, unknown>): void {
      const { measurementId } = config as GA4PluginConfig;
      if (measurementId && typeof window !== "undefined" && window.gtag) {
        window.gtag("config", measurementId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }
      // GA4 is the base format, so pass through directly
      window.gtag("event", eventName, params);
    },
  };
}
