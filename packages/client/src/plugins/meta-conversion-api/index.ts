/**
 * `@sunwjy/funnel-client/meta-conversion-api` — Meta Conversion API (CAPI) client plugin.
 *
 * @remarks
 * Collects GA4-based event data on the client side and forwards it to a
 * user-configured server endpoint for server-side delivery to Meta's
 * Conversion API. Shares the `eventId` from {@link EventContext} with the
 * browser-side Meta Pixel plugin to enable server-browser deduplication.
 *
 * PII fields (em/ph/fn/ln/external_id) are SHA-256 hashed in the browser
 * before being sent to the server endpoint, so the server only ever receives
 * hashed values. If SubtleCrypto is unavailable, the fields are omitted
 * rather than transmitted in the clear.
 *
 * @packageDocumentation
 */

import {
  type EventContext,
  type EventMap,
  type EventName,
  type FunnelPlugin,
  hashPii,
  type Item,
  type UserProperties,
} from "@sunwjy/funnel-core";
import { postJson } from "../../internal/transport.js";

/**
 * Configuration for the Meta Conversion API plugin.
 */
export interface MetaConversionApiPluginConfig {
  /**
   * The server endpoint URL that receives the event payload and forwards it
   * to Meta CAPI. When omitted (or empty), `track()` is a no-op — useful for
   * SSR / partial configs.
   */
  endpoint?: string;
  /**
   * Meta CAPI Test Event Code (e.g., "TEST12345"). When set, every event
   * is tagged with this code so it appears in the Meta Events Manager
   * "Test Events" tab.
   */
  testEventCode?: string;
}

/** @internal */
interface MetaCapiUserData {
  fbp?: string;
  fbc?: string;
  client_user_agent?: string;
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  external_id?: string;
}

/** @internal */
interface MetaCapiCustomData {
  currency?: string;
  value?: number;
  content_ids?: string[];
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  num_items?: number;
  search_string?: string;
  order_id?: string;
  [key: string]: unknown;
}

/** @internal */
interface MetaCapiPayload {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: "website";
  user_data: MetaCapiUserData;
  custom_data: MetaCapiCustomData;
  test_event_code?: string;
}

const EVENT_MAP: Partial<Record<EventName, string>> = {
  page_view: "PageView",
  view_item: "ViewContent",
  view_item_list: "ViewContent",
  select_item: "ViewContent",
  view_cart: "ViewContent",
  add_to_wishlist: "AddToWishlist",
  search: "Search",
  view_search_results: "Search",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  generate_lead: "Lead",
  sign_up: "CompleteRegistration",
};

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getQueryParam(name: string): string | undefined {
  if (typeof window === "undefined" || !window.location) return undefined;
  try {
    return new URLSearchParams(window.location.search).get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

function transformItems(items?: Item[]): Partial<MetaCapiCustomData> {
  if (!items || items.length === 0) return {};
  return {
    content_ids: items.map((item) => item.item_id),
    contents: items.map((item) => {
      const entry: { id: string; quantity: number; item_price?: number } = {
        id: item.item_id,
        quantity: item.quantity ?? 1,
      };
      if (item.price !== undefined) entry.item_price = item.price;
      return entry;
    }),
    num_items: items.length,
  };
}

function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): MetaCapiCustomData {
  const result: MetaCapiCustomData = {};
  const p = params as Record<string, unknown>;

  if ("items" in p && Array.isArray(p.items)) {
    Object.assign(result, transformItems(p.items as Item[]));
  }

  if ("currency" in p) result.currency = p.currency as string;
  if ("value" in p) result.value = p.value as number;

  switch (eventName) {
    case "search":
    case "view_search_results":
      if ("search_term" in p) result.search_string = p.search_term as string;
      break;
    case "purchase":
    case "refund":
      if ("transaction_id" in p) result.order_id = p.transaction_id as string;
      break;
  }

  return result;
}

function collectUserData(): MetaCapiUserData {
  const userData: MetaCapiUserData = {};

  const fbp = getCookie("_fbp");
  if (fbp) userData.fbp = fbp;

  let fbc = getCookie("_fbc");
  if (!fbc) {
    const fbclid = getQueryParam("fbclid");
    if (fbclid) {
      // Meta's documented synthesis: fb.<subdomainIndex>.<creationTime>.<fbclid>
      fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
  }
  if (fbc) userData.fbc = fbc;

  if (typeof navigator !== "undefined") {
    userData.client_user_agent = navigator.userAgent;
  }

  return userData;
}

async function applyHashedUserProperties(
  userData: MetaCapiUserData,
  properties: UserProperties,
): Promise<void> {
  const [em, ph, fn, ln, externalId] = await Promise.all([
    hashPii(properties.email, "email"),
    hashPii(properties.phone_number, "phone"),
    hashPii(properties.first_name, "name"),
    hashPii(properties.last_name, "name"),
    hashPii(properties.user_id, "id"),
  ]);
  if (em) userData.em = em;
  if (ph) userData.ph = ph;
  if (fn) userData.fn = fn;
  if (ln) userData.ln = ln;
  if (externalId) userData.external_id = externalId;
}

/**
 * Creates a Meta Conversion API (CAPI) client plugin instance.
 */
export function createMetaConversionApiPlugin(): FunnelPlugin {
  let endpoint = "";
  let testEventCode: string | undefined;
  let storedUserProperties: UserProperties | null = null;

  return {
    name: "meta-conversion-api",

    initialize(config: Record<string, unknown>): void {
      const c = config as unknown as MetaConversionApiPluginConfig;
      if (c.endpoint) endpoint = c.endpoint;
      testEventCode = c.testEventCode;
    },

    setUser(properties: UserProperties): void {
      storedUserProperties = properties;
    },

    resetUser(): void {
      storedUserProperties = null;
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !endpoint) {
        return;
      }

      const metaEventName = EVENT_MAP[eventName] ?? eventName;
      const customData = transformParams(eventName, params);
      const userData = collectUserData();
      const userProps = storedUserProperties;
      const eventTime = Math.floor(Date.now() / 1000);
      const sourceUrl = window.location.href;
      const captured = endpoint;
      const code = testEventCode;

      function send(): void {
        const payload: MetaCapiPayload = {
          event_name: metaEventName,
          event_time: eventTime,
          event_id: context.eventId,
          event_source_url: sourceUrl,
          action_source: "website",
          user_data: userData,
          custom_data: customData,
        };
        if (code) payload.test_event_code = code;
        postJson(captured, JSON.stringify(payload));
      }

      if (!userProps) {
        // Synchronous fast path — nothing to hash.
        send();
        return;
      }

      // Hash PII before posting. The track method stays sync; the network
      // dispatch is fire-and-forget after hashing completes.
      void (async () => {
        await applyHashedUserProperties(userData, userProps);
        send();
      })();
    },
  };
}
