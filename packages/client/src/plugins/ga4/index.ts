/**
 * `@sunwjy/funnel-client/ga4` — Google Analytics 4 plugin.
 *
 * @remarks
 * Since GA4 is the base event format, events are passed through without transformation.
 *
 * @packageDocumentation
 */

import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-core";

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
  /**
   * Additional config object forwarded to `gtag('config', id, config)`.
   *
   * @remarks
   * Used to control GA4 SDK behavior such as `send_page_view`, `debug_mode`,
   * `cookie_domain`, `anonymize_ip`, etc.
   */
  config?: Record<string, unknown>;
}

/**
 * Creates a GA4 plugin instance.
 *
 * @remarks
 * Sends events to Google Analytics 4 via `window.gtag`.
 * Automatically skipped in SSR environments where `window` is not available.
 */
export function createGA4Plugin(): FunnelPlugin {
  let trackedUserPropertyKeys = new Set<string>();

  return {
    name: "ga4",

    initialize(config: Record<string, unknown>): void {
      const { measurementId, config: gtagConfig } = config as GA4PluginConfig;
      if (measurementId && typeof window !== "undefined" && window.gtag) {
        if (gtagConfig) {
          window.gtag("config", measurementId, gtagConfig);
        } else {
          window.gtag("config", measurementId);
        }
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }
      window.gtag("event", eventName, {
        ...(params as Record<string, unknown>),
        event_id: context.eventId,
      });
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }
      const { user_id, ...rest } = properties;
      if (user_id !== undefined) {
        window.gtag("set", { user_id });
      }
      const userProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          userProperties[key] = value;
          trackedUserPropertyKeys.add(key);
        }
      }
      if (Object.keys(userProperties).length > 0) {
        window.gtag("set", "user_properties", userProperties);
      }
    },

    resetUser(): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }
      window.gtag("set", { user_id: null });
      if (trackedUserPropertyKeys.size > 0) {
        const cleared: Record<string, null> = {};
        for (const key of trackedUserPropertyKeys) {
          cleared[key] = null;
        }
        window.gtag("set", "user_properties", cleared);
        trackedUserPropertyKeys = new Set<string>();
      }
    },
  };
}
