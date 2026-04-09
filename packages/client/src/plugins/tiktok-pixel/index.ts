/**
 * `@funnel/plugin-tiktok-pixel` — TikTok Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into TikTok Pixel standard events.
 * Unmapped events are sent as custom events via `ttq.track()`.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item, UserProperties } from "@funnel/core";

declare global {
  interface Window {
    ttq: {
      load: (pixelId: string) => void;
      page: () => void;
      track: (eventName: string, params?: Record<string, unknown>) => void;
      identify: (params: Record<string, unknown>) => void;
    };
  }
}

/**
 * Configuration for the TikTok Pixel plugin.
 */
export interface TikTokPixelPluginConfig {
  /** TikTok Pixel ID. */
  pixelId?: string;
}

/**
 * Mapping from GA4 event names to TikTok Pixel standard event names.
 *
 * @remarks
 * GA4 events not present in this map are sent as custom events via `ttq.track()`.
 *
 * @see {@link https://ads.tiktok.com/help/article/standard-events-parameters | TikTok Pixel Standard Events}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "CompletePayment",
  search: "Search",
  sign_up: "CompleteRegistration",
  generate_lead: "SubmitForm",
  select_item: "ClickButton",
};

/**
 * Transforms a GA4 {@link Item} array into TikTok Pixel contents format.
 *
 * @param items - The items to transform.
 * @returns TikTok Pixel contents parameter, or an empty object if no items are provided.
 *
 * @internal
 */
function transformItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    contents: items.map((item) => ({
      content_id: item.item_id,
      content_name: item.item_name,
      content_type: "product",
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
    })),
  };
}

/**
 * Transforms GA4 event parameters into TikTok Pixel parameters.
 *
 * @typeParam E - The event name type.
 * @param eventName - The GA4 event name.
 * @param params - The GA4 event parameters.
 * @returns Parameters formatted for the TikTok Pixel API.
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
    result.query = p.search_term;
  }

  return result;
}

/**
 * Creates a TikTok Pixel plugin instance.
 *
 * @remarks
 * Automatically transforms GA4 events into TikTok Pixel standard events
 * and sends them via `window.ttq`.
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @returns A TikTok Pixel {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createTikTokPixelPlugin } from "@funnel/plugin-tiktok-pixel";
 *
 * const funnel = new Funnel({
 *   plugins: [createTikTokPixelPlugin()],
 * });
 *
 * funnel.initialize({
 *   "tiktok-pixel": { pixelId: "ABCDE12345" },
 * });
 * ```
 */
export function createTikTokPixelPlugin(): FunnelPlugin {
  return {
    name: "tiktok-pixel",

    initialize(config: Record<string, unknown>): void {
      const { pixelId } = config as TikTokPixelPluginConfig;
      if (pixelId && typeof window !== "undefined" && window.ttq) {
        window.ttq.load(pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.ttq) {
        return;
      }

      if (eventName === "page_view") {
        window.ttq.page();
        return;
      }

      const tiktokEvent = EVENT_MAP[eventName];
      const tiktokParams = transformParams(eventName, params);

      if (tiktokEvent) {
        window.ttq.track(tiktokEvent, tiktokParams);
      } else {
        window.ttq.track(eventName, tiktokParams);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.ttq) return;

      const identifyParams: Record<string, unknown> = {};
      if (properties.email !== undefined) identifyParams.email = properties.email;
      if (properties.phone_number !== undefined)
        identifyParams.phone_number = properties.phone_number;
      if (properties.user_id !== undefined) identifyParams.external_id = properties.user_id;

      if (Object.keys(identifyParams).length > 0) {
        window.ttq.identify(identifyParams);
      }
    },
  };
}
