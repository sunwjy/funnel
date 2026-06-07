/**
 * `@sunwjy/funnel-client/reddit-pixel` — Reddit Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into Reddit Pixel standard events.
 * Unmapped events are sent as custom events via `rdt('track', 'Custom', ...)`
 * with the original GA4 event name carried in `customEventName`.
 *
 * Every tracked event includes `conversionId: context.eventId` so the same
 * conversion can be deduplicated against Reddit's Conversions API (CAPI).
 *
 * @packageDocumentation
 */

import type { EventContext, EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";

declare global {
  interface Window {
    rdt: (...args: unknown[]) => void;
  }
}

/**
 * Configuration for the Reddit Pixel plugin.
 */
export interface RedditPixelPluginConfig {
  /** Reddit Pixel (advertiser) ID. */
  pixelId?: string;
}

/**
 * Mapping from GA4 event names to Reddit Pixel standard event names.
 *
 * @remarks
 * Unmapped GA4 events fall through to a `Custom` event, with the original
 * GA4 event name preserved via `customEventName`.
 *
 * @see {@link https://business.reddithelp.com/helpcenter/s/article/Reddit-Pixel-Event-Metadata | Reddit Pixel Event Metadata}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "PageVisit",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  add_to_wishlist: "AddToWishlist",
  purchase: "Purchase",
  generate_lead: "Lead",
  sign_up: "SignUp",
  search: "Search",
};

function transformItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  const products = items.map((item) => {
    const entry: Record<string, unknown> = { id: item.item_id };
    if (item.item_name !== undefined) entry.name = item.item_name;
    if (item.item_category !== undefined) entry.category = item.item_category;
    return entry;
  });
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  return { products, itemCount };
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
    result.search = p.search_term;
  }

  if (eventName === "purchase" && "transaction_id" in p) {
    result.transactionId = p.transaction_id;
  }

  return result;
}

/**
 * Creates a Reddit Pixel plugin instance.
 */
export function createRedditPixelPlugin(): FunnelPlugin {
  return {
    name: "reddit-pixel",

    initialize(config: Record<string, unknown>): void {
      const { pixelId } = config as RedditPixelPluginConfig;
      if (pixelId && typeof window !== "undefined" && window.rdt) {
        window.rdt("init", pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.rdt) {
        return;
      }

      const redditEvent = EVENT_MAP[eventName];
      const metadata: Record<string, unknown> = {
        ...transformParams(eventName, params),
        conversionId: context.eventId,
      };

      if (redditEvent) {
        window.rdt("track", redditEvent, metadata);
      } else {
        window.rdt("track", "Custom", { ...metadata, customEventName: eventName });
      }
    },
  };
}
