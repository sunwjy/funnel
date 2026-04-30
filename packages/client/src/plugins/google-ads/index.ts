/**
 * `@sunwjy/funnel-client/google-ads` — Google Ads conversion tracking plugin.
 *
 * @remarks
 * Transforms GA4-based events into Google Ads conversion events.
 * Requires conversion labels to be configured per event for proper attribution.
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
    gtag: (...args: unknown[]) => void;
  }
}

export interface GoogleAdsPluginConfig {
  /** Google Ads conversion ID (e.g., "AW-XXXXXXXXX"). */
  conversionId?: string;
  /** Mapping of GA4 event names to Google Ads conversion labels. */
  conversionLabels?: Partial<Record<EventName, string>>;
}

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

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.gtag) {
        return;
      }

      const p = params as Record<string, unknown>;
      const label = conversionLabels[eventName];
      const enriched: Record<string, unknown> = {
        ...p,
        event_id: context.eventId,
      };

      if (label && conversionId) {
        // Conversion event: forward all GA4 params (items, coupon, etc.) plus send_to.
        // The GA4 event name is replaced with 'conversion' but the params survive
        // so Google Ads Enhanced Conversions can read items/transaction_id/etc.
        const conversionParams: Record<string, unknown> = {
          ...enriched,
          send_to: `${conversionId}/${label}`,
        };
        window.gtag("event", "conversion", conversionParams);
      } else {
        window.gtag("event", eventName, enriched);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.gtag) return;

      const userData: Record<string, unknown> = {};
      if (properties.email !== undefined) userData.email = properties.email;
      if (properties.phone_number !== undefined) userData.phone_number = properties.phone_number;

      if (properties.first_name !== undefined || properties.last_name !== undefined) {
        const address: Record<string, unknown> = {};
        if (properties.first_name !== undefined) address.first_name = properties.first_name;
        if (properties.last_name !== undefined) address.last_name = properties.last_name;
        userData.address = address;
      }

      if (Object.keys(userData).length > 0) {
        // gtag.js auto-hashes user_data when the consumer's tag config has
        // enhanced conversions enabled. Raw values are documented as acceptable.
        window.gtag("set", "user_data", userData);
      }
    },
  };
}
