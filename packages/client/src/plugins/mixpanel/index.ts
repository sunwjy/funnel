/**
 * `@sunwjy/funnel-client/mixpanel` — Mixpanel plugin.
 *
 * @remarks
 * Sends GA4-based events to Mixpanel with Title Case event names.
 * All event properties are passed through with items flattened.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item, UserProperties } from "@sunwjy/funnel-core";

declare global {
  interface Window {
    mixpanel: {
      init: (token: string) => void;
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
}

/**
 * Converts a snake_case string to Title Case.
 * e.g., "page_view" → "Page View"
 *
 * @internal
 */
function toTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Flattens a GA4 {@link Item} array into Mixpanel-friendly properties.
 *
 * @internal
 */
function flattenItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    item_ids: items.map((item) => item.item_id),
    item_names: items.map((item) => item.item_name),
    num_items: items.length,
  };
}

/**
 * Transforms GA4 event parameters into Mixpanel properties.
 *
 * @remarks
 * Items are flattened into `item_ids`, `item_names`, and `num_items`.
 * All other properties pass through as-is.
 *
 * @typeParam E - The event name type.
 * @param _eventName - The GA4 event name (unused, reserved for future mapping).
 * @param params - The GA4 event parameters.
 * @returns Properties formatted for the Mixpanel API.
 *
 * @internal
 */
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

/**
 * Creates a Mixpanel plugin instance.
 *
 * @remarks
 * Converts GA4 event names to Title Case and sends them via `window.mixpanel.track`.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns A Mixpanel {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@sunwjy/funnel-core";
 * import { createMixpanelPlugin } from "@sunwjy/funnel-client/mixpanel";
 *
 * const funnel = new Funnel({
 *   plugins: [createMixpanelPlugin()],
 * });
 *
 * funnel.initialize({
 *   mixpanel: { token: "your-project-token" },
 * });
 * ```
 */
export function createMixpanelPlugin(): FunnelPlugin {
  return {
    name: "mixpanel",

    initialize(config: Record<string, unknown>): void {
      const { token } = config as MixpanelPluginConfig;
      if (token && typeof window !== "undefined" && window.mixpanel) {
        window.mixpanel.init(token);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.mixpanel) {
        return;
      }

      const mixpanelEvent = toTitleCase(eventName);
      const mixpanelParams = transformParams(eventName, params);

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
