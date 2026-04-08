/**
 * `@funnel/plugin-naver-ad` — Naver Ad (WCSLOG) conversion tracking plugin.
 *
 * @remarks
 * Transforms GA4-based events into Naver Ad conversion tracking calls.
 * Uses `window.wcs` and `window.wcs_do()` globals.
 * Unmapped events are silently ignored.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin } from "@funnel/core";

declare global {
  interface Window {
    wcs: {
      inflow: (siteId: string) => void;
      cnv: string | undefined;
    };
    wcs_do: () => void;
  }
}

export interface NaverAdPluginConfig {
  /** Naver Ad site ID. */
  siteId?: string;
}

/** Naver conversion type codes. */
const CONVERSION_TYPES: Partial<Record<EventName, string>> = {
  purchase: "1",
  sign_up: "2",
  add_to_cart: "3",
  generate_lead: "4",
  begin_checkout: "5",
  add_payment_info: "5",
};

export function createNaverAdPlugin(): FunnelPlugin {
  return {
    name: "naver-ad",

    initialize(config: Record<string, unknown>): void {
      const { siteId } = config as NaverAdPluginConfig;
      if (siteId && typeof window !== "undefined" && window.wcs) {
        window.wcs.inflow(siteId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.wcs || !window.wcs_do) {
        return;
      }

      const p = params as Record<string, unknown>;
      const conversionType = CONVERSION_TYPES[eventName];

      if (eventName === "page_view") {
        window.wcs.cnv = undefined;
        window.wcs_do();
        return;
      }

      if (conversionType) {
        const value = typeof p.value === "number" ? String(p.value) : "0";
        window.wcs.cnv = `${conversionType},${value}`;
        window.wcs_do();
      }
      // Unmapped events are silently ignored
    },
  };
}
