import type { EventMap, EventName, FunnelPlugin } from "@funnel/core";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export interface GA4PluginConfig {
  measurementId?: string;
}

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
