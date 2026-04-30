/**
 * `@sunwjy/funnel-client/meta-pixel` — Meta Pixel (Facebook Pixel) plugin.
 *
 * @remarks
 * Transforms GA4-based events into Meta Pixel standard events.
 * Unmapped events are sent as custom events via `fbq("trackCustom", ...)`.
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

interface MetaPixelContent {
  id: string;
  quantity: number;
  item_price?: number;
}

interface MetaPixelParams {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: MetaPixelContent[];
  currency?: string;
  value?: number;
  num_items?: number;
  search_string?: string;
  status?: string;
  order_id?: string;
  page_title?: string;
  page_location?: string;
  page_referrer?: string;
}

/**
 * Mapping from GA4 event names to Meta Pixel standard event names.
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/reference | Meta Pixel Event Reference}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "PageView",
  view_item: "ViewContent",
  view_item_list: "ViewContent",
  select_item: "ViewContent",
  add_to_wishlist: "AddToWishlist",
  search: "Search",
  view_search_results: "Search",
  view_cart: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  generate_lead: "Lead",
  sign_up: "CompleteRegistration",
};

function transformItems(items?: Item[]): Partial<MetaPixelParams> {
  if (!items || items.length === 0) return {};
  return {
    content_ids: items.map((item) => item.item_id),
    content_type: "product",
    contents: items.map((item): MetaPixelContent => {
      const entry: MetaPixelContent = {
        id: item.item_id,
        quantity: item.quantity ?? 1,
      };
      if (item.price !== undefined) entry.item_price = item.price;
      return entry;
    }),
    num_items: items.length,
  };
}

function transformParams<E extends EventName>(eventName: E, params: EventMap[E]): MetaPixelParams {
  const result: MetaPixelParams = {};
  const p = params as Record<string, unknown>;
  let hasItems = false;

  if ("items" in p && Array.isArray(p.items)) {
    Object.assign(result, transformItems(p.items as Item[]));
    hasItems = (p.items as Item[]).length > 0;
  }

  if ("currency" in p) result.currency = p.currency as string;
  if ("value" in p) result.value = p.value as number;

  switch (eventName) {
    case "search":
    case "view_search_results":
      if ("search_term" in p) result.search_string = p.search_term as string;
      break;
    case "sign_up":
      result.status = "complete";
      if ("method" in p) result.content_name = p.method as string;
      break;
    case "view_item_list":
    case "select_item":
      if (hasItems) result.content_type = "product_group";
      break;
    case "purchase":
    case "refund":
      if ("transaction_id" in p) result.order_id = p.transaction_id as string;
      break;
    case "page_view":
      if ("page_title" in p) result.page_title = p.page_title as string;
      if ("page_location" in p) result.page_location = p.page_location as string;
      if ("page_referrer" in p) result.page_referrer = p.page_referrer as string;
      break;
  }

  return result;
}

/**
 * Creates a Meta Pixel plugin instance.
 */
export function createMetaPixelPlugin(): FunnelPlugin {
  let pixelId: string | undefined;

  return {
    name: "meta-pixel",

    initialize(config: Record<string, unknown>): void {
      const { pixelId: id } = config as MetaPixelPluginConfig;
      pixelId = id;
      if (pixelId && typeof window !== "undefined" && window.fbq) {
        window.fbq("init", pixelId);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.fbq || !pixelId) return;

      const metaUserData: Record<string, string> = {};
      if (properties.email) metaUserData.em = properties.email;
      if (properties.phone_number) metaUserData.ph = properties.phone_number;
      if (properties.first_name) metaUserData.fn = properties.first_name;
      if (properties.last_name) metaUserData.ln = properties.last_name;
      if (properties.user_id) metaUserData.external_id = properties.user_id;

      if (Object.keys(metaUserData).length > 0) {
        window.fbq("init", pixelId, metaUserData);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.fbq) {
        return;
      }

      const metaEventName = EVENT_MAP[eventName];
      const metaParams = transformParams(eventName, params);

      if (metaEventName) {
        window.fbq("track", metaEventName, metaParams, { eventID: context.eventId });
      } else {
        window.fbq("trackCustom", eventName, metaParams, { eventID: context.eventId });
      }
    },
  };
}
