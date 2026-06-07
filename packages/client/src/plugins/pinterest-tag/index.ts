/**
 * `@sunwjy/funnel-client/pinterest-tag` — Pinterest Tag plugin.
 *
 * @remarks
 * Transforms GA4-based events into Pinterest Tag standard events.
 * Unmapped events are sent as `custom` events via `pintrk("track", "custom", ...)`,
 * preserving the original GA4 event name under `event_name` in the event data.
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
    /** Pinterest Tag pintrk function. */
    pintrk: (...args: unknown[]) => void;
  }
}

/**
 * Configuration for the Pinterest Tag plugin.
 */
export interface PinterestTagPluginConfig {
  /** Pinterest Tag ID (advertiser ad account tag). */
  tagId?: string;
}

/**
 * A single product entry in a Pinterest `line_items` array.
 */
interface PinterestLineItem {
  product_id?: string;
  product_name?: string;
  product_price?: number;
  product_quantity?: number;
  product_category?: string;
}

/**
 * Event data passed to `pintrk("track", ...)`.
 */
interface PinterestEventData {
  value?: number;
  currency?: string;
  order_quantity?: number;
  order_id?: string;
  search_query?: string;
  line_items?: PinterestLineItem[];
  /** Deduplication ID, shared with the Conversions API. */
  event_id?: string;
  /** Original GA4 event name, attached when falling through to `custom`. */
  event_name?: string;
}

/**
 * Mapping from GA4 event names to Pinterest Tag standard event names.
 *
 * @remarks
 * Pinterest's standard event set is lowercase. `begin_checkout` is intentionally
 * NOT mapped: Pinterest's `checkout` represents a *completed* purchase, so mapping
 * the GA4 checkout-initiation event to it would inflate conversion counts. It falls
 * through to a `custom` event instead. (Newer Pinterest docs expose `initiatecheckout`,
 * but it is not part of the historically stable core event set and is omitted here to
 * avoid emitting an event some advertiser accounts may not recognize.)
 *
 * Unmapped GA4 events fall through to the `custom` event.
 *
 * @see {@link https://help.pinterest.com/en/business/article/add-event-codes | Pinterest Tag event codes}
 */
const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "pagevisit",
  view_item_list: "viewcategory",
  select_promotion: "viewcategory",
  search: "search",
  view_search_results: "search",
  add_to_cart: "addtocart",
  purchase: "checkout",
  sign_up: "signup",
  generate_lead: "lead",
};

function transformItems(items?: Item[]): PinterestLineItem[] | undefined {
  if (!items || items.length === 0) return undefined;
  return items.map((item) => {
    const entry: PinterestLineItem = {
      product_id: item.item_id,
      product_name: item.item_name,
      product_quantity: item.quantity ?? 1,
    };
    if (item.price !== undefined) entry.product_price = item.price;
    if (item.item_category !== undefined) entry.product_category = item.item_category;
    return entry;
  });
}

function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): PinterestEventData {
  const result: PinterestEventData = {};
  const p = params as Record<string, unknown>;

  const lineItems = transformItems("items" in p ? (p.items as Item[]) : undefined);
  if (lineItems) result.line_items = lineItems;

  if ("currency" in p) result.currency = p.currency as string;
  if ("value" in p) result.value = p.value as number;

  if (eventName === "search" || eventName === "view_search_results") {
    if ("search_term" in p) result.search_query = p.search_term as string;
  }

  if (eventName === "purchase") {
    if ("transaction_id" in p) result.order_id = p.transaction_id as string;
    if (lineItems) {
      result.order_quantity = lineItems.reduce(
        (sum, item) => sum + (item.product_quantity ?? 0),
        0,
      );
    }
  }

  return result;
}

/**
 * Creates a Pinterest Tag plugin instance.
 */
export function createPinterestTagPlugin(): FunnelPlugin {
  return {
    name: "pinterest-tag",

    initialize(config: Record<string, unknown>): void {
      const { tagId } = config as PinterestTagPluginConfig;
      if (tagId && typeof window !== "undefined" && window.pintrk) {
        window.pintrk("load", tagId);
        window.pintrk("page");
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.pintrk) {
        return;
      }

      const data: PinterestEventData = {
        ...transformParams(eventName, params),
        event_id: context.eventId,
      };

      const pinterestEvent = EVENT_MAP[eventName];
      if (pinterestEvent) {
        window.pintrk("track", pinterestEvent, data);
      } else {
        data.event_name = eventName;
        window.pintrk("track", "custom", data);
      }
    },

    setUser(properties: UserProperties): void {
      if (typeof window === "undefined" || !window.pintrk) return;

      const enhancedMatch: Record<string, unknown> = {};
      if (properties.email !== undefined) enhancedMatch.em = properties.email;
      if (properties.phone_number !== undefined) enhancedMatch.ph = properties.phone_number;
      if (properties.user_id !== undefined) enhancedMatch.external_id = properties.user_id;
      if (properties.first_name !== undefined) enhancedMatch.fn = properties.first_name;
      if (properties.last_name !== undefined) enhancedMatch.ln = properties.last_name;

      if (Object.keys(enhancedMatch).length > 0) {
        window.pintrk("set", enhancedMatch);
      }
    },
  };
}
