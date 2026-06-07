/**
 * `@sunwjy/funnel-client/mixpanel` — Mixpanel plugin.
 *
 * @remarks
 * Sends GA4-based events to Mixpanel with Title Case event names.
 * `$insert_id` is set from {@link EventContext.eventId} for server-side
 * deduplication.
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

declare global {
  interface Window {
    mixpanel: {
      init: (token: string, config?: Record<string, unknown>) => void;
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      identify: (distinctId: string) => void;
      people: {
        set: (properties: Record<string, unknown>) => void;
      };
      reset: () => void;
    };
  }
}

export interface MixpanelPluginConfig {
  /** Mixpanel project token. */
  token?: string;
  /**
   * Additional config object forwarded to `mixpanel.init(token, config)`.
   *
   * @remarks
   * Used to configure `api_host` (e.g. `https://api-eu.mixpanel.com` for EU
   * data residency), `debug`, `persistence`, `batch_requests`, etc.
   */
  config?: Record<string, unknown>;
  /**
   * When `true`, events are dropped until `analytics_storage` is granted via
   * `setConsent`. Default: platform delegation (no gating).
   */
  consentRequired?: boolean;
}

function transformParams<E extends EventName>(
  _eventName: E,
  params: EventMap[E],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const p = params as Record<string, unknown>;

  for (const [key, value] of Object.entries(p)) {
    if (key === "items" && Array.isArray(value)) {
      Object.assign(result, flattenItems(value as Item[]));
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function createMixpanelPlugin(factoryConfig?: MixpanelPluginConfig): FunnelPlugin {
  let consentRequired = false;
  const gate = createConsentGate("analytics_storage", () => consentRequired);

  return {
    name: "mixpanel",

    initialize(config: Record<string, unknown>): void {
      const {
        token,
        config: mpConfig,
        consentRequired: required,
      } = { ...factoryConfig, ...(config as MixpanelPluginConfig) };
      consentRequired = required ?? false;
      if (token && typeof window !== "undefined" && window.mixpanel) {
        if (mpConfig) {
          window.mixpanel.init(token, mpConfig);
        } else {
          window.mixpanel.init(token);
        }
      }
    },

    setConsent(state: ConsentState): void {
      gate.update(state);
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.mixpanel || gate.blocked()) {
        return;
      }

      const mixpanelEvent = toTitleCase(eventName);
      const mixpanelParams = {
        ...transformParams(eventName, params),
        $insert_id: context.eventId,
      };

      window.mixpanel.track(mixpanelEvent, mixpanelParams);
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.mixpanel) {
        return;
      }

      const { user_id, email, phone_number, first_name, last_name, ...rest } = properties;

      if (user_id !== undefined) {
        window.mixpanel.identify(user_id);
      }

      const peopleProps: Record<string, unknown> = {};
      if (email !== undefined) peopleProps.$email = email;
      if (phone_number !== undefined) peopleProps.$phone = phone_number;
      if (first_name !== undefined) peopleProps.$first_name = first_name;
      if (last_name !== undefined) peopleProps.$last_name = last_name;
      Object.assign(peopleProps, rest);

      if (Object.keys(peopleProps).length > 0) {
        window.mixpanel.people.set(peopleProps);
      }
    },

    resetUser(): void {
      if (typeof window === "undefined" || !window.mixpanel) {
        return;
      }

      window.mixpanel.reset();
    },
  };
}
