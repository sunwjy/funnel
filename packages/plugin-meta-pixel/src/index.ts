import type { EventMap, EventName, FunnelPlugin, Item } from "@funnel/core";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

export interface MetaPixelPluginConfig {
  pixelId?: string;
}

interface MetaPixelParams {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: Array<{ id: string; quantity: number }>;
  currency?: string;
  value?: number;
  num_items?: number;
  search_string?: string;
  status?: string;
  [key: string]: unknown;
}

// GA4 event name → Meta Pixel standard event name
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

export function createMetaPixelPlugin(): FunnelPlugin {
  return {
    name: "meta-pixel",

    initialize(config: Record<string, unknown>): void {
      const { pixelId } = config as MetaPixelPluginConfig;
      if (pixelId && typeof window !== "undefined" && window.fbq) {
        window.fbq("init", pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.fbq) {
        return;
      }

      const metaEventName = EVENT_MAP[eventName];
      const metaParams = transformParams(eventName, params);

      if (metaEventName) {
        if (metaEventName === "PageView") {
          window.fbq("track", "PageView");
        } else {
          window.fbq("track", metaEventName, metaParams);
        }
      } else {
        // No standard Meta event mapping — send as custom event
        window.fbq("trackCustom", eventName, metaParams);
      }
    },
  };
}
