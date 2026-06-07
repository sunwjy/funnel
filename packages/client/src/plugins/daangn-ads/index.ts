/**
 * `@sunwjy/funnel-client/daangn-ads` — Daangn Business (당근비즈니스) 전환 추적 코드 plugin.
 *
 * @remarks
 * Transforms GA4-based events into Daangn's "전환 추적 코드" (conversion tracking
 * code) events, dispatched through the global `window.karrotPixel` object loaded
 * from `https://karrot-pixel.business.daangn.com/0.2/karrot-pixel.umd.js`.
 *
 * The verified public API exposes:
 * - `window.karrotPixel.init("전환 추적 코드 ID")`
 * - `window.karrotPixel.track("ViewPage")`
 * - `window.karrotPixel.track("ViewContent", { id })`
 * - `window.karrotPixel.track("AddToCart", { products })`
 * - `window.karrotPixel.track("CompleteRegistration")`
 * - `window.karrotPixel.track("Purchase", { total_price, total_quantity, products })`
 *
 * where each `products` entry is `{ id, name, quantity, price }` and the
 * `Purchase` totals (`total_price`, `total_quantity`) are passed as strings.
 *
 * Daangn's pixel exposes only a fixed set of standard conversion events — it has
 * no public custom-event API and no client/server event-ID or deduplication
 * parameter — so `context.eventId` is unused and unmapped GA4 events (e.g.
 * `view_item_list`, `select_item`, `search`, `refund`) are silently dropped,
 * mirroring the Kakao Pixel plugin.
 *
 * Verified against the official loader/snippet documented by NHN Commerce's
 * conversion-tracking guide (the actual snippet served on merchant sites):
 * https://marketing-help.nhn-commerce.com/conversion-tracking-setup/godomall-script-setup/karrot-pixel
 * and the Daangn Business install guide at https://business.daangn.com/.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";

interface KarrotPixelProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface KarrotPixelEventParams {
  /** Product ID for `ViewContent`. */
  id?: string;
  /** Product list for `AddToCart` / `Purchase`. */
  products?: KarrotPixelProduct[];
  /** Total purchase amount for `Purchase`, passed as a string per the snippet. */
  total_price?: string;
  /** Total purchase quantity for `Purchase`, passed as a string per the snippet. */
  total_quantity?: string;
}

interface KarrotPixel {
  /** Initializes the pixel with the issued 전환 추적 코드 ID. */
  init: (trackId: string) => void;
  /** Tracks a Daangn standard conversion event. */
  track: (eventName: string, params?: KarrotPixelEventParams) => void;
}

declare global {
  interface Window {
    karrotPixel: KarrotPixel;
  }
}

export interface DaangnAdsPluginConfig {
  /**
   * Daangn 전환 추적 코드 ID (conversion tracking code ID) issued in
   * 당근비즈니스 → 광고도구 → 전환 추적 관리.
   */
  trackId?: string;
}

function transformProducts(items?: Item[]): KarrotPixelProduct[] {
  if (!items || items.length === 0) return [];
  return items.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    quantity: item.quantity ?? 1,
    price: item.price ?? 0,
  }));
}

/**
 * Creates a Daangn Business (당근비즈니스) conversion tracking plugin instance.
 */
export function createDaangnAdsPlugin(): FunnelPlugin {
  let trackId: string | undefined;
  let initialized = false;

  function getPixel(): KarrotPixel | null {
    if (typeof window === "undefined" || !window.karrotPixel || !trackId) return null;
    if (!initialized) {
      window.karrotPixel.init(trackId);
      initialized = true;
    }
    return window.karrotPixel;
  }

  return {
    name: "daangn-ads",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as DaangnAdsPluginConfig;
      trackId = pluginConfig.trackId;
      initialized = false; // re-init on next track call
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      const pixel = getPixel();
      if (!pixel) return;

      const p = params as Record<string, unknown>;

      switch (eventName) {
        case "page_view":
          pixel.track("ViewPage");
          break;
        case "view_item": {
          const items = p.items as Item[] | undefined;
          pixel.track("ViewContent", { id: items?.[0]?.item_id ?? "" });
          break;
        }
        case "add_to_cart": {
          const items = p.items as Item[] | undefined;
          pixel.track("AddToCart", { products: transformProducts(items) });
          break;
        }
        case "sign_up":
          pixel.track("CompleteRegistration");
          break;
        case "purchase": {
          const items = p.items as Item[] | undefined;
          const products = transformProducts(items);
          // Daangn expects total_price = sum(quantity * price). When per-item
          // pricing isn't available we fall back to the GA4 top-level value.
          const computedTotal = products.reduce((sum, prod) => sum + prod.quantity * prod.price, 0);
          const totalPrice =
            computedTotal > 0 ? computedTotal : ((p.value as number | undefined) ?? 0);
          const totalQuantity = products.reduce((sum, prod) => sum + prod.quantity, 0);
          // The snippet passes totals as strings; mirror that contract.
          pixel.track("Purchase", {
            total_price: String(totalPrice),
            total_quantity: String(totalQuantity),
            products,
          });
          break;
        }
        default:
          // No mapping — Daangn's pixel only supports a fixed set of standard
          // conversion events and has no custom-event API. view_item_list /
          // select_item / search / refund / etc. are silently dropped.
          break;
      }
    },
  };
}
