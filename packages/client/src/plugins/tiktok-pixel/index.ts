/**
 * `@sunwjy/funnel-client/tiktok-pixel` — TikTok Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into TikTok Pixel standard events.
 * Unmapped events are sent as custom events via `ttq.track()`.
 *
 * @packageDocumentation
 */

import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  Item,
  UserProperties,
} from "@sunwjy/funnel-core";

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
 * `select_item` is intentionally NOT mapped: TikTok's `ClickButton` is for
 * non-product CTAs and conflating PLP clicks with it inflates that counter
 * in TikTok ads manager. Unmapped GA4 events fall through to a custom event.
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
};

function transformItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    contents: items.map((item) => {
      const entry: Record<string, unknown> = {
        content_id: item.item_id,
        content_name: item.item_name,
        content_type: "product",
        quantity: item.quantity ?? 1,
      };
      if (item.price !== undefined) entry.price = item.price;
      return entry;
    }),
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
    result.query = p.search_term;
  }

  if (eventName === "purchase" && "transaction_id" in p) {
    result.order_id = p.transaction_id;
  }

  return result;
}

/**
 * Creates a TikTok Pixel plugin instance.
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

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.ttq) {
        return;
      }

      if (eventName === "page_view") {
        window.ttq.page();
        return;
      }

      const tiktokEvent = EVENT_MAP[eventName];
      const tiktokParams = {
        ...transformParams(eventName, params),
        event_id: context.eventId,
      };

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
