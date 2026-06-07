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
  ConsentState,
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  Item,
  UserProperties,
} from "@sunwjy/funnel-core";
import { flattenItems, toTitleCase } from "../../internal/analytics-shared.js";
import { createConsentGate } from "../../internal/consent.js";

/**
 * Identify object from the Amplitude Browser SDK 2.
 *
 * @remarks
 * `amplitude.identify()` only accepts an instance created via
 * `new amplitude.Identify()` whose user properties are registered through
 * `set()` — passing a plain object is silently ignored by the real SDK.
 */
interface AmplitudeIdentify {
  set: (property: string, value: unknown) => AmplitudeIdentify;
}

declare global {
  interface Window {
    amplitude: {
      init: (apiKey: string, options?: Record<string, unknown>) => void;
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      setUserId: (userId: string | null) => void;
      identify: (identifyEvent: AmplitudeIdentify) => void;
      Identify: new () => AmplitudeIdentify;
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
  /**
   * When `true`, events are dropped until `analytics_storage` is granted via
   * `setConsent`. Default: platform delegation (no gating).
   */
  consentRequired?: boolean;
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

export function createAmplitudePlugin(factoryConfig?: AmplitudePluginConfig): FunnelPlugin {
  let consentRequired = false;
  const gate = createConsentGate("analytics_storage", () => consentRequired);

  return {
    name: "amplitude",

    initialize(config: Record<string, unknown>): void {
      const {
        apiKey,
        options,
        consentRequired: required,
      } = { ...factoryConfig, ...(config as AmplitudePluginConfig) };
      consentRequired = required ?? false;
      if (apiKey && typeof window !== "undefined" && window.amplitude) {
        if (options) {
          window.amplitude.init(apiKey, options);
        } else {
          window.amplitude.init(apiKey);
        }
      }
    },

    setConsent(state: ConsentState): void {
      gate.update(state);
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.amplitude || gate.blocked()) {
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

      const entries = Object.entries(rest).filter(([, value]) => value !== undefined);
      if (entries.length > 0 && typeof window.amplitude.Identify === "function") {
        const identifyEvent = new window.amplitude.Identify();
        for (const [key, value] of entries) {
          identifyEvent.set(key, value);
        }
        window.amplitude.identify(identifyEvent);
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
