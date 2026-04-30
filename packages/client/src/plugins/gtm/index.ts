/**
 * `@sunwjy/funnel-client/gtm` — Google Tag Manager plugin.
 *
 * @remarks
 * Pushes GA4-format events to the GTM `dataLayer`.
 * GTM containers route each event to the appropriate tags based on triggers.
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
    /** GTM dataLayer array. */
    dataLayer: Record<string, unknown>[];
  }
}

/**
 * Configuration for the GTM plugin.
 */
export interface GTMPluginConfig {
  /** GTM Container ID (e.g., "GTM-XXXXXXX"). Used only for validation logging. */
  containerId?: string;
}

/**
 * Events whose currency / value / items / coupon should be wrapped under an
 * `ecommerce` key per GTM's GA4 ecommerce convention.
 */
const ECOMMERCE_EVENTS: ReadonlySet<EventName> = new Set<EventName>([
  "view_item",
  "view_item_list",
  "select_item",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "add_payment_info",
  "add_shipping_info",
  "add_to_wishlist",
  "purchase",
  "refund",
  "view_promotion",
  "select_promotion",
]);

/**
 * Creates a GTM plugin instance.
 */
export function createGTMPlugin(): FunnelPlugin {
  let started = false;

  return {
    name: "gtm",

    initialize(config: Record<string, unknown>): void {
      const { containerId } = config as GTMPluginConfig;
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      if (containerId && !started) {
        window.dataLayer.push({
          "gtm.start": Date.now(),
          event: "gtm.js",
        });
        started = true;
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];

      if (ECOMMERCE_EVENTS.has(eventName)) {
        // Clear the previous ecommerce object before pushing the new one
        // so stale items/value don't leak between events.
        window.dataLayer.push({ ecommerce: null });
        const p = params as Record<string, unknown>;
        const ecommerce: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(p)) {
          if (value !== undefined) ecommerce[key] = value;
        }
        window.dataLayer.push({
          event: eventName,
          event_id: context.eventId,
          ecommerce,
        });
        return;
      }

      window.dataLayer.push({
        event: eventName,
        event_id: context.eventId,
        ...(params as Record<string, unknown>),
      });
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      const { user_id, ...rest } = properties;
      const push: Record<string, unknown> = { event: "funnel.set_user" };
      if (user_id !== undefined) push.user_id = user_id;
      const userProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) userProperties[key] = value;
      }
      if (Object.keys(userProperties).length > 0) {
        push.user_properties = userProperties;
      }
      window.dataLayer.push(push);
    },

    resetUser(): void {
      if (typeof window === "undefined") {
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "funnel.reset_user",
        user_id: null,
        user_properties: null,
      });
    },
  };
}
