/**
 * `@sunwjy/funnel-client/x-pixel` — X (Twitter) Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into X Pixel standard events.
 * Unmapped events are sent as custom events via `twq("event", ...)`.
 *
 * @packageDocumentation
 */

import {
  type EventContext,
  type EventMap,
  type EventName,
  type FunnelPlugin,
  hashPii,
  type Item,
  type UserProperties,
} from "@sunwjy/funnel-core";

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

function hasPerItemFields(items: Item[]): boolean {
  return items.some((it) => it.price !== undefined || it.quantity !== undefined);
}

function transformItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  if (hasPerItemFields(items)) {
    return {
      contents: items.map((item) => {
        const entry: Record<string, unknown> = { id: item.item_id };
        if (item.price !== undefined) entry.item_price = item.price;
        if (item.quantity !== undefined) entry.quantity = item.quantity;
        return entry;
      }),
      num_items: items.length,
    };
  }
  return {
    content_ids: items.map((item) => item.item_id),
    content_type: "product",
    num_items: items.length,
  };
}

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

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.twq) {
        return;
      }

      const xEvent = EVENT_MAP[eventName];
      const xParams = {
        ...transformParams(eventName, params),
        event_id: context.eventId,
      };

      if (xEvent) {
        window.twq("event", xEvent, xParams);
      } else {
        window.twq("event", eventName, xParams);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.twq || !pixelId) return;

      const capturedPixelId = pixelId;
      void (async () => {
        const [em, ph] = await Promise.all([
          hashPii(properties.email, "email"),
          hashPii(properties.phone_number, "phone"),
        ]);
        const xUserData: Record<string, unknown> = {};
        if (em) xUserData.em = em;
        if (ph) xUserData.ph_number = ph;

        if (Object.keys(xUserData).length > 0) {
          window.twq("config", capturedPixelId, xUserData);
        }
      })();
    },
  };
}
