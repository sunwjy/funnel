/**
 * `@sunwjy/funnel-client/toss-ads` — Toss Ads (토스애즈) Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into Toss Ads (toss ads) Pixel standard events.
 *
 * Verified against the official Toss Ads advertiser guide:
 * {@link https://toss-ads.gitbook.io/guide/resources/tosspixel/self-hosted}.
 * The web SDK exposes a single global function, `TossPixel(conversionCode)`,
 * which returns an instance with one method per standard event
 * (`pageView`, `productView`, `addToCart`, `initiateCheckout`, `purchase`,
 * `search`, `signUp`, `signIn`, `lead`, `addToWishlist`, `viewHome`, …).
 *
 * Assumptions documented from the guide:
 * - Toss Pixel has **no native event/deduplication ID field**. The guide
 *   recommends de-duplicating by `order_id` on the server. Since every Funnel
 *   `track()` call carries a unique `context.eventId`, we forward it via the
 *   universally-supported `custom_param1` field so it is available for
 *   server-side reconciliation. `order_id` is still set from
 *   `transaction_id` on purchase/checkout for the platform's own dedup.
 * - Standard parameters mirror the guide's `purchase()` example exactly:
 *   `order_id`, `revenue`, `total_quantity`, `currency`, and a `products`
 *   array of `{ product_id, product_name, category_id, category_name, price,
 *   quantity }`. All parameters are optional per the guide.
 * - Default currency is `KRW` (Toss is a Korean platform).
 * - Toss Pixel exposes no user-identification / advanced-matching API in the
 *   public guide, so `setUser` is intentionally not implemented.
 * - Unmapped GA4 events (e.g. `view_item_list`, `select_item`, `refund`,
 *   `remove_from_cart`) are silently dropped; Toss has no matching standard
 *   method and the guide does not document an arbitrary custom-event channel.
 *
 * @packageDocumentation
 */

import type { EventContext, EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";

/** A single product entry in a Toss Pixel `products` array. */
interface TossProduct {
  product_id: string;
  product_name: string;
  category_id?: string;
  category_name?: string;
  price?: number;
  quantity?: number;
}

/** Parameters accepted by Toss Pixel event methods (all optional per the guide). */
interface TossEventParams {
  order_id?: string;
  product_id?: string;
  product_name?: string;
  category_id?: string;
  category_name?: string;
  price?: number;
  quantity?: number;
  revenue?: number;
  total_quantity?: number;
  currency?: string;
  products?: TossProduct[];
  /** Free-form custom slots (used here to forward the dedup `eventId`). */
  custom_param1?: string;
  custom_param2?: string;
  custom_param3?: string;
  custom_param4?: string;
  custom_param5?: string;
}

type TossEventMethod = (params?: TossEventParams) => void;

/** The instance returned by `window.TossPixel(conversionCode)`. */
interface TossPixelInstance {
  pageView: TossEventMethod;
  viewHome: TossEventMethod;
  productView: TossEventMethod;
  addToCart: TossEventMethod;
  addToWishlist: TossEventMethod;
  initiateCheckout: TossEventMethod;
  purchase: TossEventMethod;
  search: TossEventMethod;
  signUp: TossEventMethod;
  signIn: TossEventMethod;
  lead: TossEventMethod;
}

declare global {
  interface Window {
    TossPixel: (conversionCode: string) => TossPixelInstance;
  }
}

/**
 * Configuration for the Toss Ads Pixel plugin.
 */
export interface TossAdsPluginConfig {
  /** Toss Ads conversion code (전환 코드), issued per ad account in the dashboard. */
  conversionCode?: string;
}

/** Default currency for Toss (Korean platform). */
const DEFAULT_CURRENCY = "KRW";

/**
 * Maps GA4 event names to the corresponding Toss Pixel instance method.
 *
 * @remarks
 * `page_view` → `pageView`, `view_item` → `productView`, and so on.
 * Events without a Toss equivalent are absent and silently dropped.
 */
const EVENT_METHOD_MAP: Partial<Record<EventName, keyof TossPixelInstance>> = {
  page_view: "pageView",
  view_item: "productView",
  add_to_cart: "addToCart",
  add_to_wishlist: "addToWishlist",
  begin_checkout: "initiateCheckout",
  purchase: "purchase",
  search: "search",
  sign_up: "signUp",
  login: "signIn",
  generate_lead: "lead",
};

function transformProducts(items?: Item[]): TossProduct[] {
  if (!items || items.length === 0) return [];
  return items.map((item) => {
    const product: TossProduct = {
      product_id: item.item_id,
      product_name: item.item_name,
    };
    if (item.item_category !== undefined) {
      // GA4 has no separate category ID; mirror item_category into both Toss fields.
      product.category_id = item.item_category;
      product.category_name = item.item_category;
    }
    if (item.price !== undefined) product.price = item.price;
    product.quantity = item.quantity ?? 1;
    return product;
  });
}

function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
  context: EventContext,
): TossEventParams {
  const p = params as Record<string, unknown>;
  const result: TossEventParams = {
    // Toss has no native dedup ID; forward eventId for server reconciliation.
    custom_param1: context.eventId,
  };

  const items = Array.isArray(p.items) ? (p.items as Item[]) : undefined;
  const products = transformProducts(items);

  if (eventName === "view_item") {
    // Single-product method: flatten the first item.
    const first = products[0];
    if (first) {
      result.product_id = first.product_id;
      result.product_name = first.product_name;
      if (first.category_id !== undefined) result.category_id = first.category_id;
      if (first.category_name !== undefined) result.category_name = first.category_name;
      if (first.price !== undefined) result.price = first.price;
    }
    result.currency = (p.currency as string | undefined) ?? DEFAULT_CURRENCY;
    return result;
  }

  if (eventName === "search") {
    if (typeof p.search_term === "string") result.custom_param2 = p.search_term;
    return result;
  }

  if (eventName === "page_view" || eventName === "sign_up" || eventName === "login") {
    return result;
  }

  if (eventName === "generate_lead") {
    if (p.value !== undefined) result.revenue = p.value as number;
    result.currency = (p.currency as string | undefined) ?? DEFAULT_CURRENCY;
    return result;
  }

  // Cart / checkout / purchase: ecommerce events with a products array.
  if (products.length > 0) {
    result.products = products;
    result.total_quantity = products.reduce((sum, prod) => sum + (prod.quantity ?? 1), 0);
  }

  if (eventName === "purchase" || eventName === "begin_checkout") {
    if (typeof p.transaction_id === "string") result.order_id = p.transaction_id;
  }

  // `value` is GA4's monetary total; Toss calls it `revenue`.
  if (p.value !== undefined) {
    result.revenue = p.value as number;
  } else {
    const computed = products.reduce(
      (sum, prod) => sum + (prod.price ?? 0) * (prod.quantity ?? 1),
      0,
    );
    if (computed > 0) result.revenue = computed;
  }

  result.currency = (p.currency as string | undefined) ?? DEFAULT_CURRENCY;
  return result;
}

/**
 * Creates a Toss Ads (토스애즈) Pixel plugin instance.
 */
export function createTossAdsPlugin(): FunnelPlugin {
  let conversionCode: string | undefined;
  let cachedPixel: TossPixelInstance | null = null;

  function getPixel(): TossPixelInstance | null {
    if (typeof window === "undefined" || !window.TossPixel || !conversionCode) return null;
    if (!cachedPixel) {
      cachedPixel = window.TossPixel(conversionCode);
    }
    return cachedPixel;
  }

  return {
    name: "toss-ads",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as TossAdsPluginConfig;
      conversionCode = pluginConfig.conversionCode;
      cachedPixel = null; // re-resolve on next track call
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      const pixel = getPixel();
      if (!pixel) return;

      const method = EVENT_METHOD_MAP[eventName];
      // No Toss equivalent (view_item_list, select_item, refund, …): drop it.
      if (!method) return;

      const tossParams = transformParams(eventName, params, context);
      pixel[method](tossParams);
    },
  };
}
