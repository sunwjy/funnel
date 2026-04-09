/**
 * `@funnel/plugin-amplitude` — Amplitude plugin.
 *
 * @remarks
 * Sends GA4-based events to Amplitude with Title Case event names.
 * Purchase events map `value` to `revenue` for Amplitude's revenue tracking.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item, UserProperties } from "@funnel/core";

declare global {
  interface Window {
    amplitude: {
      init: (apiKey: string) => void;
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      setUserId: (userId: string | null) => void;
      identify: (identifyObj: Record<string, unknown>) => void;
    };
  }
}

export interface AmplitudePluginConfig {
  /** Amplitude API key. */
  apiKey?: string;
}

/**
 * Converts a snake_case string to Title Case.
 * e.g., "page_view" → "Page View"
 */
function toTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Events where `value` should be mapped to `revenue`. */
const REVENUE_EVENTS: Set<EventName> = new Set(["purchase", "refund"]);

function flattenItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    item_ids: items.map((item) => item.item_id),
    item_names: items.map((item) => item.item_name),
    num_items: items.length,
  };
}

function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const p = params as Record<string, unknown>;

  for (const [key, value] of Object.entries(p)) {
    if (key === "items" && Array.isArray(value)) {
      Object.assign(result, flattenItems(value as Item[]));
    } else if (key === "value" && REVENUE_EVENTS.has(eventName)) {
      result.revenue = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function createAmplitudePlugin(): FunnelPlugin {
  return {
    name: "amplitude",

    initialize(config: Record<string, unknown>): void {
      const { apiKey } = config as AmplitudePluginConfig;
      if (apiKey && typeof window !== "undefined" && window.amplitude) {
        window.amplitude.init(apiKey);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.amplitude) {
        return;
      }

      const amplitudeEvent = toTitleCase(eventName);
      const amplitudeParams = transformParams(eventName, params);

      window.amplitude.track(amplitudeEvent, amplitudeParams);
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.amplitude) {
        return;
      }

      const { user_id, ...rest } = properties;

      if (user_id !== undefined) {
        window.amplitude.setUserId(user_id);
      }

      if (Object.keys(rest).length > 0) {
        window.amplitude.identify(rest);
      }
    },

    resetUser(): void {
      if (typeof window === "undefined" || !window.amplitude) {
        return;
      }

      window.amplitude.setUserId(null);
    },
  };
}
