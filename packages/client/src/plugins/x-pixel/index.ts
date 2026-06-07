/**
 * `@sunwjy/funnel-client/x-pixel` — X (Twitter) Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into X Pixel standard events.
 * Unmapped events are sent as custom events via `twq("event", ...)`.
 *
 * Advanced matching: X expects `email_address` / `phone_number` as EVENT
 * parameters. The uwt.js pixel SHA-256-hashes them client-side before
 * transmission, so the plugin attaches normalized plaintext (pre-hashing
 * would be hashed again by the pixel and break matching). Phone numbers
 * are normalized to `+<country code><number>` (E.164) per X's docs.
 *
 * @see {@link https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites | X conversion tracking}
 *
 * @packageDocumentation
 */

import {
  type EventContext,
  type EventMap,
  type EventName,
  type FunnelPlugin,
  type Item,
  normalizePii,
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
  let userParams: Record<string, string> = {};

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
        ...userParams,
        event_id: context.eventId,
      };

      if (xEvent) {
        window.twq("event", xEvent, xParams);
      } else {
        window.twq("event", eventName, xParams);
      }
    },

    setUser(properties: UserProperties): void {
      // Stored locally and attached to every subsequent event — X has no
      // config-level user-data call. The pixel hashes these on dispatch.
      const next: Record<string, string> = {};
      const email = normalizePii(properties.email, "email");
      const phone = normalizePii(properties.phone_number, "phone_e164");
      if (email) next.email_address = email;
      if (phone) next.phone_number = phone;
      userParams = next;
    },

    resetUser(): void {
      userParams = {};
    },
  };
}
