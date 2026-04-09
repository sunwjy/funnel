/**
 * `@funnel/plugin-x-pixel` — X (Twitter) Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into X Pixel standard events.
 * Unmapped events are sent as custom events via `twq("event", ...)`.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item, UserProperties } from "@funnel/core";

declare global {
  interface Window {
    twq: (...args: unknown[]) => void;
  }
}

/**
 * Configuration for the X Pixel plugin.
 */
export interface XPixelPluginConfig {
  /** X Pixel ID. */
  pixelId?: string;
}

/**
 * Mapping from GA4 event names to X Pixel standard event names.
 *
 * @remarks
 * GA4 events not present in this map are sent as custom events
 * via `twq("event", eventName, params)`.
 *
 * @see {@link https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html | X Pixel Event Reference}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "PageVisit",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
  sign_up: "CompleteRegistration",
  generate_lead: "Lead",
  add_payment_info: "AddPaymentInfo",
};

/**
 * Transforms a GA4 {@link Item} array into X Pixel parameter format.
 *
 * @param items - The items to transform.
 * @returns X Pixel item parameters, or an empty object if no items are provided.
 *
 * @internal
 */
function transformItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    content_ids: items.map((item) => item.item_id),
    content_type: "product",
    num_items: items.length,
  };
}

/**
 * Transforms GA4 event parameters into X Pixel parameters.
 *
 * @remarks
 * Common fields (`currency`, `value`, `items`) are mapped automatically.
 * Event-specific transformations are applied for `search` and `purchase`.
 *
 * @typeParam E - The event name type.
 * @param eventName - The GA4 event name.
 * @param params - The GA4 event parameters.
 * @returns Parameters formatted for the X Pixel API.
 *
 * @internal
 */
function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const p = params as Record<string, unknown>;

  if ("items" in p && Array.isArray(p.items)) {
    Object.assign(result, transformItems(p.items as Item[]));
  }

  if ("currency" in p) result.currency = p.currency;
  if ("value" in p) result.value = p.value;

  if (eventName === "search" && "search_term" in p) {
    result.search_string = p.search_term;
  }

  if (eventName === "purchase" && "transaction_id" in p) {
    result.order_id = p.transaction_id;
  }

  return result;
}

/**
 * Creates an X Pixel plugin instance.
 *
 * @remarks
 * Automatically transforms GA4 events into X Pixel standard events
 * and sends them via `window.twq`.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns An X Pixel {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createXPixelPlugin } from "@funnel/plugin-x-pixel";
 *
 * const funnel = new Funnel({
 *   plugins: [createXPixelPlugin()],
 * });
 *
 * funnel.initialize({
 *   "x-pixel": { pixelId: "o12345" },
 * });
 * ```
 */
export function createXPixelPlugin(): FunnelPlugin {
  let pixelId: string | undefined;

  return {
    name: "x-pixel",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as XPixelPluginConfig;
      pixelId = pluginConfig.pixelId;
      if (pixelId && typeof window !== "undefined" && window.twq) {
        window.twq("config", pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.twq) {
        return;
      }

      const xEvent = EVENT_MAP[eventName];
      const xParams = transformParams(eventName, params);

      if (xEvent) {
        window.twq("event", xEvent, xParams);
      } else {
        window.twq("event", eventName, xParams);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.twq || !pixelId) return;

      const xUserData: Record<string, unknown> = {};
      if (properties.email !== undefined) xUserData.em = properties.email;
      if (properties.phone_number !== undefined) xUserData.ph_number = properties.phone_number;

      if (Object.keys(xUserData).length > 0) {
        window.twq("config", pixelId, xUserData);
      }
    },
  };
}
