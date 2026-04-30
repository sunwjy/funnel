/**
 * `@sunwjy/funnel-client/linkedin-insight` — LinkedIn Insight Tag plugin.
 *
 * @remarks
 * Sends conversion events to LinkedIn via `window.lintrk`.
 * Each GA4 event must be mapped to a LinkedIn conversion ID via configuration.
 * Page views are tracked automatically by the LinkedIn Insight Tag.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin } from "@sunwjy/funnel-core";

declare global {
  interface Window {
    lintrk: (command: string, params: Record<string, unknown>) => void;
    _linkedin_data_partner_ids: string[];
  }
}

export interface LinkedInInsightPluginConfig {
  /** LinkedIn Partner ID. */
  partnerId?: string;
  /** Mapping of GA4 event names to LinkedIn conversion IDs. */
  conversionIds?: Partial<Record<EventName, number>>;
  /**
   * When true, emits a `console.warn` for non-`page_view` events that arrive
   * without a `conversionIds` mapping. Off by default to keep production logs
   * quiet.
   */
  debug?: boolean;
}

export function createLinkedInInsightPlugin(): FunnelPlugin {
  let conversionIds: Partial<Record<EventName, number>> = {};
  let debug = false;

  return {
    name: "linkedin-insight",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as LinkedInInsightPluginConfig;
      conversionIds = pluginConfig.conversionIds ?? {};
      debug = pluginConfig.debug ?? false;

      if (pluginConfig.partnerId && typeof window !== "undefined") {
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        if (!window._linkedin_data_partner_ids.includes(pluginConfig.partnerId)) {
          window._linkedin_data_partner_ids.push(pluginConfig.partnerId);
        }
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.lintrk) {
        return;
      }

      // Page views are tracked automatically by the Insight Tag
      if (eventName === "page_view") {
        return;
      }

      const conversionId = conversionIds[eventName];
      if (conversionId === undefined) {
        if (debug) {
          console.warn(
            `[funnel/linkedin-insight] No conversion_id mapping for "${eventName}" — event dropped`,
          );
        }
        return;
      }

      const p = params as Record<string, unknown>;
      const trackParams: Record<string, unknown> = { conversion_id: conversionId };

      // LinkedIn supports a value object for revenue conversions.
      if (typeof p.value === "number" && typeof p.currency === "string") {
        trackParams.value = { currency: p.currency, amount: p.value };
      }

      window.lintrk("track", trackParams);
    },
  };
}
