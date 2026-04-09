/**
 * `@funnel/plugin-meta-pixel` — Meta Pixel (Facebook Pixel) plugin.
 *
 * @remarks
 * Transforms GA4-based events into Meta Pixel standard events.
 * Unmapped events are sent as custom events via `fbq("trackCustom", ...)`.
 *
 * @packageDocumentation
 */

import type { EventContext, EventMap, EventName, FunnelPlugin, Item } from "@funnel/core";

declare global {
  interface Window {
    /** Meta Pixel fbq function. */
    fbq: (...args: unknown[]) => void;
  }
}

/**
 * Configuration for the Meta Pixel plugin.
 */
export interface MetaPixelPluginConfig {
  /** Meta Pixel ID. */
  pixelId?: string;
}

/**
 * Parameter format expected by the Meta Pixel API.
 *
 * @internal
 */
interface MetaPixelParams {
  /** Array of product content IDs. */
  content_ids?: string[];
  /** Content name. */
  content_name?: string;
  /** Content type (e.g., "product", "product_group"). */
  content_type?: string;
  /** Detailed product information. */
  contents?: Array<{ id: string; quantity: number }>;
  /** Currency code. */
  currency?: string;
  /** Monetary value. */
  value?: number;
  /** Number of items. */
  num_items?: number;
  /** Search query string. */
  search_string?: string;
  /** Status value. */
  status?: string;
  [key: string]: unknown;
}

/**
 * Mapping from GA4 event names to Meta Pixel standard event names.
 *
 * @remarks
 * GA4 events not present in this map are sent as custom events
 * via `fbq("trackCustom", ...)`.
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/reference | Meta Pixel Event Reference}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "PageView",
  view_item: "ViewContent",
  view_item_list: "ViewContent",
  select_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  generate_lead: "Lead",
  sign_up: "CompleteRegistration",
};

/**
 * Transforms a GA4 {@link Item} array into Meta Pixel parameter format.
 *
 * @param items - The items to transform.
 * @returns Meta Pixel item parameters, or an empty object if no items are provided.
 *
 * @internal
 */
function transformItems(items?: Item[]): Partial<MetaPixelParams> {
  if (!items || items.length === 0) return {};
  return {
    content_ids: items.map((item) => item.item_id),
    content_type: "product",
    contents: items.map((item) => ({
      id: item.item_id,
      quantity: item.quantity ?? 1,
    })),
    num_items: items.length,
  };
}

/**
 * Transforms GA4 event parameters into Meta Pixel parameters.
 *
 * @remarks
 * Common fields (`currency`, `value`, `items`) are mapped automatically.
 * Event-specific transformations are applied for `search`, `sign_up`,
 * and `view_item_list`.
 *
 * @typeParam E - The event name type.
 * @param eventName - The GA4 event name.
 * @param params - The GA4 event parameters.
 * @returns Parameters formatted for the Meta Pixel API.
 *
 * @internal
 */
function transformParams<E extends EventName>(eventName: E, params: EventMap[E]): MetaPixelParams {
  const result: MetaPixelParams = {};
  const p = params as Record<string, unknown>;

  // Transform items if present
  if ("items" in p && Array.isArray(p.items)) {
    Object.assign(result, transformItems(p.items as Item[]));
  }

  // Pass through currency and value
  if ("currency" in p) result.currency = p.currency as string;
  if ("value" in p) result.value = p.value as number;

  // Event-specific transformations
  switch (eventName) {
    case "search":
      if ("search_term" in p) result.search_string = p.search_term as string;
      break;
    case "sign_up":
      result.status = "complete";
      if ("method" in p) result.content_name = p.method as string;
      break;
    case "view_item_list":
      result.content_type = "product_group";
      break;
  }

  return result;
}

/**
 * Creates a Meta Pixel plugin instance.
 *
 * @remarks
 * Automatically transforms GA4 events into Meta Pixel standard events
 * and sends them via `window.fbq`.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns A Meta Pixel {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createMetaPixelPlugin } from "@funnel/plugin-meta-pixel";
 *
 * const funnel = new Funnel({
 *   plugins: [createMetaPixelPlugin()],
 * });
 *
 * funnel.initialize({
 *   "meta-pixel": { pixelId: "123456789" },
 * });
 * ```
 */
export function createMetaPixelPlugin(): FunnelPlugin {
  return {
    name: "meta-pixel",

    initialize(config: Record<string, unknown>): void {
      const { pixelId } = config as MetaPixelPluginConfig;
      if (pixelId && typeof window !== "undefined" && window.fbq) {
        window.fbq("init", pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.fbq) {
        return;
      }

      const metaEventName = EVENT_MAP[eventName];
      const metaParams = transformParams(eventName, params);

      if (metaEventName) {
        if (metaEventName === "PageView") {
          window.fbq("track", "PageView", {}, { eventID: context.eventId });
        } else {
          window.fbq("track", metaEventName, metaParams, { eventID: context.eventId });
        }
      } else {
        // No standard Meta event mapping — send as custom event
        window.fbq("trackCustom", eventName, metaParams, { eventID: context.eventId });
      }
    },
  };
}
