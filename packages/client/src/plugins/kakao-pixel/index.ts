/**
 * `@sunwjy/funnel-client/kakao-pixel` — Kakao Pixel plugin.
 *
 * @remarks
 * Transforms GA4-based events into Kakao Pixel standard events.
 * Kakao Pixel does not support custom events or client-server deduplication;
 * unmapped events are silently ignored.
 *
 * @packageDocumentation
 */

import type { ConsentState, EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";
import { createConsentGate } from "../../internal/consent.js";

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
  /**
   * When `true`, events are dropped until `ad_storage` is granted via
   * `setConsent`. Default: platform delegation (no gating).
   */
  consentRequired?: boolean;
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
 */
export function createKakaoPixelPlugin(factoryConfig?: KakaoPixelPluginConfig): FunnelPlugin {
  let trackId: string | undefined;
  let cachedPixel: KakaoPixelInstance | null = null;
  let consentRequired = false;
  const gate = createConsentGate("ad_storage", () => consentRequired);

  function getPixel(): KakaoPixelInstance | null {
    if (typeof window === "undefined" || !window.kakaoPixel || !trackId) return null;
    if (!cachedPixel) {
      cachedPixel = window.kakaoPixel(trackId);
    }
    return cachedPixel;
  }

  return {
    name: "kakao-pixel",

    initialize(config: Record<string, unknown>): void {
      const pluginConfig = { ...factoryConfig, ...(config as KakaoPixelPluginConfig) };
      trackId = pluginConfig.trackId;
      consentRequired = pluginConfig.consentRequired ?? false;
      cachedPixel = null; // re-resolve on next track call
    },

    setConsent(state: ConsentState): void {
      gate.update(state);
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (gate.blocked()) return;
      const pixel = getPixel();
      if (!pixel) return;

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
        case "add_to_cart": {
          const items = p.items as Item[] | undefined;
          pixel.addToCart({ id: items?.[0]?.item_id ?? "" });
          break;
        }
        case "begin_checkout":
        case "view_cart":
          pixel.viewCart();
          break;
        case "purchase": {
          const items = p.items as Item[] | undefined;
          const products = transformProducts(items);
          // Kakao expects total_price = sum(quantity * price). When per-item
          // pricing isn't available we fall back to the GA4 top-level value.
          const computedTotal = products.reduce((sum, prod) => sum + prod.quantity * prod.price, 0);
          const totalPrice =
            computedTotal > 0 ? computedTotal : ((p.value as number | undefined) ?? 0);
          pixel.purchase({
            total_quantity: products.reduce((sum, prod) => sum + prod.quantity, 0),
            total_price: totalPrice,
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
          // No mapping — Kakao Pixel cannot receive custom events.
          // view_item_list / select_item / refund / etc. are silently dropped.
          break;
      }
    },
  };
}
