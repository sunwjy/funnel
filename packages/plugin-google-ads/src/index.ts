/**
 * `@funnel/plugin-google-ads` — Google Ads conversion tracking plugin.
 *
 * @remarks
 * Transforms GA4-based events into Google Ads conversion events.
 * Requires conversion labels to be configured per event for proper attribution.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin } from "@funnel/core";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export interface GoogleAdsPluginConfig {
  /** Google Ads conversion ID (e.g., "AW-XXXXXXXXX"). */
  conversionId?: string;
  /** Mapping of GA4 event names to Google Ads conversion labels. */
  conversionLabels?: Partial<Record<EventName, string>>;
}

const DEFAULT_CONVERSION_EVENTS: Set<EventName> = new Set([
  "purchase",
  "generate_lead",
  "sign_up",
  "add_to_cart",
  "begin_checkout",
  "add_payment_info",
]);

export function createGoogleAdsPlugin(): FunnelPlugin {
  let conversionId: string | undefined;
  let conversionLabels: Partial<Record<EventName, string>> = {};

  return {
    name: "google-ads",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as GoogleAdsPluginConfig;
      conversionId = pluginConfig.conversionId;
      conversionLabels = pluginConfig.conversionLabels ?? {};

      if (conversionId && typeof window !== "undefined" && window.gtag) {
        window.gtag("config", conversionId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }

      const p = params as Record<string, unknown>;
      const label = conversionLabels[eventName];

      if (label && conversionId) {
        // Send as conversion event with send_to
        const conversionParams: Record<string, unknown> = {
          send_to: `${conversionId}/${label}`,
        };

        if ("value" in p) conversionParams.value = p.value;
        if ("currency" in p) conversionParams.currency = p.currency;
        if ("transaction_id" in p) conversionParams.transaction_id = p.transaction_id;

        window.gtag("event", "conversion", conversionParams);
      } else if (DEFAULT_CONVERSION_EVENTS.has(eventName)) {
        // Send as standard gtag event (can still be picked up by auto-tagging)
        window.gtag("event", eventName, params);
      } else {
        // Non-conversion events — pass through
        window.gtag("event", eventName, params);
      }
    },
  };
}
