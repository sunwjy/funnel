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
}

export function createLinkedInInsightPlugin(): FunnelPlugin {
  let conversionIds: Partial<Record<EventName, number>> = {};

  return {
    name: "linkedin-insight",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as LinkedInInsightPluginConfig;
      conversionIds = pluginConfig.conversionIds ?? {};

      if (pluginConfig.partnerId && typeof window !== "undefined") {
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(pluginConfig.partnerId);
      }
    },

    track<E extends EventName>(eventName: E, _params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.lintrk) {
        return;
      }

      // Page views are tracked automatically by the Insight Tag
      if (eventName === "page_view") {
        return;
      }

      const conversionId = conversionIds[eventName];
      if (conversionId !== undefined) {
        window.lintrk("track", { conversion_id: conversionId });
      }
    },
  };
}
