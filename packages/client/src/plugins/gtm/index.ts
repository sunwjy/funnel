/**
 * `@sunwjy/funnel-client/gtm` — Google Tag Manager plugin.
 *
 * @remarks
 * Pushes GA4-format events to the GTM `dataLayer`.
 * GTM containers then route each event to the appropriate tags
 * (GA4, Meta Pixel, etc.) based on the configured triggers.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, UserProperties } from "@sunwjy/funnel-core";

declare global {
  interface Window {
    /** GTM dataLayer array. */
    dataLayer: Record<string, unknown>[];
  }
}

/**
 * Configuration for the GTM plugin.
 */
export interface GTMPluginConfig {
  /** GTM Container ID (e.g., "GTM-XXXXXXX"). Used only for validation logging. */
  containerId?: string;
}

/**
 * Creates a GTM plugin instance.
 *
 * @remarks
 * Sends events to Google Tag Manager via `window.dataLayer.push()`.
 * Each push includes an `event` key (the GA4 event name) alongside the event parameters,
 * which GTM triggers can match against.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns A GTM {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@sunwjy/funnel-core";
 * import { createGTMPlugin } from "@sunwjy/funnel-client/gtm";
 *
 * const funnel = new Funnel({
 *   plugins: [createGTMPlugin()],
 * });
 *
 * funnel.initialize({
 *   gtm: { containerId: "GTM-XXXXXXX" },
 * });
 * ```
 */
export function createGTMPlugin(): FunnelPlugin {
  return {
    name: "gtm",

    initialize(config: Record<string, unknown>): void {
      const { containerId } = config as GTMPluginConfig;
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      if (containerId) {
        window.dataLayer.push({
          "gtm.start": Date.now(),
          event: "gtm.js",
        });
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        ...params,
      });
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "set_user_properties", user_properties: properties });
    },

    resetUser(): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "reset_user_properties", user_properties: null });
    },
  };
}
