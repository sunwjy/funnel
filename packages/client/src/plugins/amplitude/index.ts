/**
 * `@sunwjy/funnel-client/amplitude` — Amplitude plugin.
 *
 * @remarks
 * Sends GA4-based events to Amplitude with Title Case event names.
 * Purchase/refund events map `value` to `revenue`. Each event carries
 * `insert_id` from {@link EventContext.eventId} for server-side dedup.
 *
 * @packageDocumentation
 */

import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  Item,
  UserProperties,
} from "@sunwjy/funnel-core";
import { flattenItems, toTitleCase } from "../../internal/analytics-shared.js";

declare global {
  interface Window {
    amplitude: {
      init: (apiKey: string, options?: Record<string, unknown>) => void;
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      setUserId: (userId: string | null) => void;
      identify: (identifyObj: Record<string, unknown>) => void;
    };
  }
}

export interface AmplitudePluginConfig {
  /** Amplitude API key. */
  apiKey?: string;
  /**
   * Options forwarded to `amplitude.init(apiKey, options)`.
   *
   * @remarks
   * Used to configure `serverZone` (e.g. `"EU"`), `defaultTracking`,
   * `flushQueueSize`, etc.
   */
  options?: Record<string, unknown>;
}

const REVENUE_EVENTS: ReadonlySet<EventName> = new Set<EventName>(["purchase", "refund"]);

function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const p = params as Record<string, unknown>;
  const isRevenueEvent = REVENUE_EVENTS.has(eventName);

  for (const [key, value] of Object.entries(p)) {
    if (key === "items" && Array.isArray(value)) {
      Object.assign(result, flattenItems(value as Item[]));
    } else if (key === "value" && isRevenueEvent) {
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
      const { apiKey, options } = config as AmplitudePluginConfig;
      if (apiKey && typeof window !== "undefined" && window.amplitude) {
        if (options) {
          window.amplitude.init(apiKey, options);
        } else {
          window.amplitude.init(apiKey);
        }
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.amplitude) {
        return;
      }

      const amplitudeEvent = toTitleCase(eventName);
      const amplitudeParams = {
        ...transformParams(eventName, params),
        insert_id: context.eventId,
      };

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
