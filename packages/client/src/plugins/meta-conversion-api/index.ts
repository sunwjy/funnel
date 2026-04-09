/**
 * `@funnel/plugin-meta-conversion-api` — Meta Conversion API (CAPI) client plugin.
 *
 * @remarks
 * Collects GA4-based event data on the client side and forwards it to a
 * user-configured server endpoint for server-side delivery to Meta's
 * Conversion API. Shares the `eventId` from {@link EventContext} with the
 * browser-side Meta Pixel plugin to enable server-browser deduplication.
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
} from "@funnel/core";

/**
 * Configuration for the Meta Conversion API plugin.
 */
export interface MetaConversionApiPluginConfig {
  /** The server endpoint URL that receives the event payload and forwards it to Meta CAPI. */
  endpoint: string;
}

/**
 * User data collected from the browser for Meta CAPI.
 *
 * @internal
 */
interface MetaCapiUserData {
  /** Meta browser ID cookie (_fbp). */
  fbp?: string;
  /** Meta click ID cookie (_fbc). */
  fbc?: string;
  /** Browser user agent string. */
  client_user_agent?: string;
  /** Hashed email address. */
  em?: string;
  /** Hashed phone number. */
  ph?: string;
  /** Hashed first name. */
  fn?: string;
  /** Hashed last name. */
  ln?: string;
  /** External user identifier. */
  external_id?: string;
}

/**
 * Custom data payload for Meta CAPI events.
 *
 * @internal
 */
interface MetaCapiCustomData {
  /** Currency code (e.g., "USD", "KRW"). */
  currency?: string;
  /** Monetary value of the event. */
  value?: number;
  /** Array of product content IDs. */
  content_ids?: string[];
  /** Detailed product information. */
  contents?: Array<{ id: string; quantity: number }>;
  /** Number of items. */
  num_items?: number;
  /** Search query string. */
  search_string?: string;
  [key: string]: unknown;
}

/**
 * Full event payload sent to the server endpoint.
 *
 * @internal
 */
interface MetaCapiPayload {
  /** Meta standard or custom event name. */
  event_name: string;
  /** Unix timestamp in seconds. */
  event_time: number;
  /** Unique event ID for browser-server deduplication. */
  event_id: string;
  /** URL where the event occurred. */
  event_source_url: string;
  /** Always "website" for browser-originated events. */
  action_source: "website";
  /** Browser-collected user data. */
  user_data: MetaCapiUserData;
  /** Event-specific custom data. */
  custom_data: MetaCapiCustomData;
}

/**
 * Mapping from GA4 event names to Meta standard event names.
 *
 * @remarks
 * GA4 events not present in this map are sent as custom events
 * using the original GA4 event name.
 *
 * @see {@link https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event | Meta CAPI Server Event Reference}
 */
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

/**
 * Reads a cookie value by name from `document.cookie`.
 *
 * @param name - The cookie name to look up.
 * @returns The decoded cookie value, or `undefined` if not found or in SSR.
 *
 * @internal
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Transforms a GA4 {@link Item} array into Meta CAPI custom data format.
 *
 * @param items - The items to transform.
 * @returns Meta CAPI item fields, or an empty object if no items are provided.
 *
 * @internal
 */
function transformItems(items?: Item[]): Partial<MetaCapiCustomData> {
  if (!items || items.length === 0) return {};
  return {
    content_ids: items.map((item) => item.item_id),
    contents: items.map((item) => ({
      id: item.item_id,
      quantity: item.quantity ?? 1,
    })),
    num_items: items.length,
  };
}

/**
 * Transforms GA4 event parameters into Meta CAPI custom data.
 *
 * @remarks
 * Common fields (`currency`, `value`, `items`) are mapped automatically.
 * Event-specific transformations are applied for `search` and `view_item_list`.
 *
 * @typeParam E - The event name type.
 * @param eventName - The GA4 event name.
 * @param params - The GA4 event parameters.
 * @returns Custom data formatted for the Meta CAPI payload.
 *
 * @internal
 */
function transformParams<E extends EventName>(
  eventName: E,
  params: EventMap[E],
): MetaCapiCustomData {
  const result: MetaCapiCustomData = {};
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
    case "view_item_list":
      // No additional custom_data transformation needed beyond items
      break;
  }

  return result;
}

/**
 * Collects browser-side user data for Meta CAPI.
 *
 * @returns User data object with fbp, fbc, and client_user_agent.
 *
 * @internal
 */
function collectUserData(): MetaCapiUserData {
  const userData: MetaCapiUserData = {};

  const fbp = getCookie("_fbp");
  if (fbp) userData.fbp = fbp;

  const fbc = getCookie("_fbc");
  if (fbc) userData.fbc = fbc;

  if (typeof navigator !== "undefined") {
    userData.client_user_agent = navigator.userAgent;
  }

  return userData;
}

/**
 * Creates a Meta Conversion API (CAPI) client plugin instance.
 *
 * @remarks
 * On each `track()` call, the plugin:
 * 1. Transforms the GA4 event into Meta's server event format.
 * 2. Collects browser-side user data (_fbp, _fbc cookies, userAgent).
 * 3. Builds a payload including the `eventId` from {@link EventContext} for
 *    browser-server deduplication with the Meta Pixel plugin.
 * 4. Sends the payload to the configured server endpoint via
 *    `navigator.sendBeacon` (preferred) with `fetch` as fallback.
 *
 * Automatically skipped in SSR environments where `window` is not available.
 *
 * @param config - Plugin configuration including the server endpoint URL.
 * @returns A Meta Conversion API {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createMetaConversionApiPlugin } from "@funnel/client/meta-conversion-api";
 *
 * const funnel = new Funnel({
 *   plugins: [createMetaConversionApiPlugin()],
 * });
 *
 * funnel.initialize({
 *   "meta-conversion-api": { endpoint: "/api/meta-capi" },
 * });
 * ```
 */
export function createMetaConversionApiPlugin(): FunnelPlugin {
  let endpoint = "";
  let storedUserProperties: UserProperties | null = null;

  return {
    name: "meta-conversion-api",

    initialize(config: Record<string, unknown>): void {
      const { endpoint: ep } = config as unknown as MetaConversionApiPluginConfig;
      if (ep) {
        endpoint = ep;
      }
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

      if (storedUserProperties) {
        if (storedUserProperties.email) userData.em = storedUserProperties.email;
        if (storedUserProperties.phone_number) userData.ph = storedUserProperties.phone_number;
        if (storedUserProperties.first_name) userData.fn = storedUserProperties.first_name;
        if (storedUserProperties.last_name) userData.ln = storedUserProperties.last_name;
        if (storedUserProperties.user_id) userData.external_id = storedUserProperties.user_id;
      }

      const payload: MetaCapiPayload = {
        event_name: metaEventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: context.eventId,
        event_source_url: window.location.href,
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      };

      const body = JSON.stringify(payload);

      // Prefer sendBeacon for reliable delivery on page unload; fall back to fetch
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (!sent) {
          // sendBeacon queue was full; fall back to fetch
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {
            // Silently ignore network errors — analytics must never throw
          });
        }
      } else {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {
          // Silently ignore network errors — analytics must never throw
        });
      }
    },
  };
}
