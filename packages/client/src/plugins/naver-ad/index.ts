/**
 * `@sunwjy/funnel-client/naver-ad` — Naver Ad conversion tracking plugin.
 *
 * @remarks
 * Transforms GA4-based events into Naver Ad conversion tracking calls using
 * the NEW conversion script API (`wcs.trans` version). The legacy
 * `wcs.cnv`-string API is deprecated by Naver and is not supported here.
 *
 * - `page_view` fires the PV beacon via `wcs_do()`.
 * - Conversion events build a `_conv` object and pass it to `wcs.trans(_conv)`.
 * - Unmapped events are silently ignored (Naver has a fixed conversion taxonomy).
 *
 * Requires the `//wcs.naver.net/wcslog.js` common script to be installed.
 *
 * @see {@link https://naver.github.io/conversion-tracking/pages/01_script_guide_wcstrans/ | Naver conversion tracking guide (wcs.trans)}
 *
 * @packageDocumentation
 */

import type { EventMap, EventName, FunnelPlugin, Item } from "@sunwjy/funnel-core";

/** Item entry of a Naver `_conv` conversion object. @internal */
interface NaverConversionItem {
  id: string;
  name: string;
  quantity?: number;
  /** Amount paid for this item line (unit price × quantity). */
  payAmount?: number;
  category?: string;
  option?: string;
}

/** Naver `_conv` conversion object passed to `wcs.trans()`. @internal */
interface NaverConversion {
  type: string;
  /** Conversion ID (e.g., order number). */
  id?: string;
  /** Conversion value — Naver's guide passes this as a string. */
  value?: string;
  items?: NaverConversionItem[];
}

declare global {
  interface Window {
    wcs: {
      inflow: (siteDomain?: string) => void;
      trans: (conversion: NaverConversion) => void;
    };
    /** Naver common-key registry (`wcs_add["wa"] = accountId`). */
    wcs_add: Record<string, string>;
    wcs_do: () => void;
  }
}

export interface NaverAdPluginConfig {
  /** Naver common key (네이버공통키), registered as `wcs_add["wa"]`. */
  accountId?: string;
  /** Site domain forwarded to `wcs.inflow()` for cookie-domain setup. */
  siteDomain?: string;
}

/**
 * GA4 event → Naver conversion type mapping.
 *
 * @remarks
 * Naver's taxonomy also includes `subscribe`, `schedule`, and
 * `custom001`–`custom010`, which have no GA4 counterpart and are not mapped.
 */
const CONVERSION_TYPES: Partial<Record<EventName, string>> = {
  purchase: "purchase",
  sign_up: "sign_up",
  add_to_cart: "add_to_cart",
  generate_lead: "lead",
  add_to_wishlist: "add_to_wishlist",
  begin_checkout: "begin_checkout",
  view_item: "view_content",
};

function transformItems(items?: Item[]): NaverConversionItem[] | undefined {
  if (!items || items.length === 0) return undefined;
  return items.map((item) => {
    const entry: NaverConversionItem = { id: item.item_id, name: item.item_name };
    if (item.item_category !== undefined) entry.category = item.item_category;
    if (item.item_variant !== undefined) entry.option = item.item_variant;
    if (item.quantity !== undefined) entry.quantity = item.quantity;
    if (item.price !== undefined) entry.payAmount = item.price * (item.quantity ?? 1);
    return entry;
  });
}

/**
 * Creates a Naver Ad plugin instance (wcs.trans conversion script).
 */
export function createNaverAdPlugin(factoryConfig?: NaverAdPluginConfig): FunnelPlugin {
  return {
    name: "naver-ad",

    initialize(config: Record<string, unknown>): void {
      const { accountId, siteDomain } = { ...factoryConfig, ...(config as NaverAdPluginConfig) };
      if (typeof window === "undefined" || !window.wcs) {
        return;
      }
      if (accountId) {
        window.wcs_add = window.wcs_add || {};
        window.wcs_add.wa = accountId;
      }
      if (siteDomain) {
        window.wcs.inflow(siteDomain);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]): void {
      if (typeof window === "undefined" || !window.wcs) {
        return;
      }

      if (eventName === "page_view") {
        if (typeof window.wcs_do === "function") {
          window.wcs_do();
        }
        return;
      }

      const type = CONVERSION_TYPES[eventName];
      // Guard `trans` so a site still running the legacy wcslog.js (no trans
      // support) degrades to a no-op instead of throwing.
      if (!type || typeof window.wcs.trans !== "function") {
        return;
      }

      const p = params as Record<string, unknown>;
      const conv: NaverConversion = { type };

      if (eventName === "purchase" && typeof p.transaction_id === "string") {
        conv.id = p.transaction_id;
      }

      const items = transformItems(p.items as Item[] | undefined);

      let value = typeof p.value === "number" ? p.value : undefined;
      if (value === undefined && eventName === "purchase" && items) {
        // Naver requires a conversion value for purchases; fall back to the
        // summed per-line payAmount when the GA4 top-level value is absent.
        const total = items.reduce((sum, item) => sum + (item.payAmount ?? 0), 0);
        if (total > 0) value = total;
      }
      if (value !== undefined) conv.value = String(value);
      if (items) conv.items = items;

      window.wcs.trans(conv);
    },
  };
}
