/**
 * `@sunwjy/funnel-client/kakao-pixel` — Kakao Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into Kakao Pixel standard events.
 * Unmapped events are silently ignored as Kakao Pixel does not support custom events.
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";

interface KakaoPixelInstance {
  pageView: () => void;
  search: (params: { keyword: string }) => void;
  viewContent: (params: { id: string }) => void;
  viewCart: () => void;
  addToCart: (params: { id: string }) => void;
  purchase: (params: {
    total_quantity: number;
    total_price: number;
    currency: string;
    products: Array<{ id: string; name: string; quantity: number; price: number }>;
  }) => void;
  completeRegistration: () => void;
  participation: () => void;
}

declare global {
  interface Window {
    kakaoPixel: (trackId: string) => KakaoPixelInstance;
  }
}

export interface KakaoPixelPluginConfig {
  /** Kakao Pixel Track ID. */
  trackId?: string;
}

function transformProducts(
  items?: Item[],
): Array<{ id: string; name: string; quantity: number; price: number }> {
  if (!items || items.length === 0) return [];
  return items.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    quantity: item.quantity ?? 1,
    price: item.price ?? 0,
  }));
}

/**
 * Creates a Kakao Pixel plugin instance.
 *
 * @remarks
 * Automatically transforms GA4 events into Kakao Pixel standard events
 * and sends them via `window.kakaoPixel`.
 * Automatically skipped in SSR environments where `window` is not available.
 * Unmapped events are silently ignored as Kakao Pixel does not support custom events.
 *
 * @returns A Kakao Pixel {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@sunwjy/funnel-core";
 * import { createKakaoPixelPlugin } from "@sunwjy/funnel-client/kakao-pixel";
 *
 * const funnel = new Funnel({
 *   plugins: [createKakaoPixelPlugin()],
 * });
 *
 * funnel.initialize({
 *   "kakao-pixel": { trackId: "1234567890" },
 * });
 * ```
 */
export function createKakaoPixelPlugin(): FunnelPlugin {
  let trackId: string | undefined;

  return {
    name: "kakao-pixel",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = config as KakaoPixelPluginConfig;
      trackId = pluginConfig.trackId;
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.kakaoPixel || !trackId) {
        return;
      }

      const pixel = window.kakaoPixel(trackId);
      const p = params as Record<string, unknown>;

      switch (eventName) {
        case "page_view":
          pixel.pageView();
          break;
        case "search":
          pixel.search({ keyword: (p.search_term as string) ?? "" });
          break;
        case "view_item": {
          const items = p.items as Item[] | undefined;
          pixel.viewContent({ id: items?.[0]?.item_id ?? "" });
          break;
        }
        case "view_item_list":
          pixel.viewContent({ id: (p.item_list_id as string) ?? "" });
          break;
        case "add_to_cart": {
          const items = p.items as Item[] | undefined;
          pixel.addToCart({ id: items?.[0]?.item_id ?? "" });
          break;
        }
        case "begin_checkout":
          pixel.viewCart();
          break;
        case "purchase": {
          const items = p.items as Item[] | undefined;
          const products = transformProducts(items);
          pixel.purchase({
            total_quantity: products.reduce((sum, prod) => sum + prod.quantity, 0),
            total_price: (p.value as number) ?? 0,
            currency: (p.currency as string) ?? "KRW",
            products,
          });
          break;
        }
        case "sign_up":
          pixel.completeRegistration();
          break;
        case "generate_lead":
          pixel.participation();
          break;
        default:
          // Kakao Pixel does not support custom events
          break;
      }
    },
  };
}
