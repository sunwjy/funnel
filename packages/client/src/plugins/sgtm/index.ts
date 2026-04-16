/**
 * `@sunwjy/funnel-client/sgtm` — Server-side Google Tag Manager (sGTM) client plugin.
 *
 * @remarks
 * Sends GA4-format events directly to a server-side GTM container via the
 * Measurement Protocol v2 JSON endpoint. Unlike the `gtm` plugin — which
 * pushes to `window.dataLayer` and relies on a client-side GTM snippet —
 * this plugin bypasses the browser GTM container entirely and POSTs each
 * event to a configured sGTM URL.
 *
 * Combine with other client plugins (e.g., `gtm`, `meta-pixel`) for a
 * hybrid browser + server setup; the `eventId` from {@link EventContext}
 * is propagated as the GA4 `event_id` parameter so server-side tagging
 * can deduplicate against browser events.
 *
 * @packageDocumentation
 */

import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-core";

/**
 * Configuration for the sGTM plugin.
 */
export interface SGTMPluginConfig {
  /**
   * Base URL of the sGTM container (e.g., `"https://sgtm.example.com"`).
   * The {@link SGTMPluginConfig.path | path} is appended to this base.
   */
  endpoint: string;
  /** GA4 Measurement ID (e.g., `"G-XXXXXXXXXX"`). */
  measurementId: string;
  /**
   * GA4 Measurement Protocol API secret.
   *
   * @remarks
   * SECURITY: Including this in browser code exposes the secret to anyone
   * who inspects your client. Prefer configuring your sGTM container's
   * GA4 Measurement Protocol client to skip `api_secret` validation for
   * browser traffic. Only set this if you explicitly accept the risk.
   */
  apiSecret?: string;
  /** Path appended to the endpoint (default: `"/mp/collect"`). */
  path?: string;
  /**
   * Override for the `client_id` value.
   *
   * @remarks
   * When omitted, a UUID is generated and persisted in `localStorage`
   * (key `_funnel_sgtm_cid`) so subsequent visits reuse the same id.
   */
  clientId?: string;
  /** Sets the `non_personalized_ads` flag on every event. */
  nonPersonalizedAds?: boolean;
}

const CLIENT_ID_STORAGE_KEY = "_funnel_sgtm_cid";
const SESSION_ID_STORAGE_KEY = "_funnel_sgtm_sid";
const DEFAULT_PATH = "/mp/collect";

/** @internal */
interface MPEvent {
  name: string;
  params: Record<string, unknown>;
}

/** @internal */
interface MPUserPropertyValue {
  value: unknown;
}

/** @internal */
interface MPPayload {
  client_id: string;
  user_id?: string;
  timestamp_micros: number;
  non_personalized_ads?: boolean;
  user_properties?: Record<string, MPUserPropertyValue>;
  events: MPEvent[];
}

function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function readStorage(storage: Storage | undefined, key: string): string | undefined {
  if (!storage) return undefined;
  try {
    return storage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(storage: Storage | undefined, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // quota exceeded, disabled, private mode — ignore
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

function getSessionStorage(): Storage | undefined {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : undefined;
  } catch {
    return undefined;
  }
}

function resolveClientId(override?: string): string {
  if (override) return override;
  const storage = getLocalStorage();
  const existing = readStorage(storage, CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;
  const cid = safeUuid();
  writeStorage(storage, CLIENT_ID_STORAGE_KEY, cid);
  return cid;
}

function resolveSessionId(): string {
  const storage = getSessionStorage();
  const existing = readStorage(storage, SESSION_ID_STORAGE_KEY);
  if (existing) return existing;
  const sid = Math.floor(Date.now() / 1000).toString();
  writeStorage(storage, SESSION_ID_STORAGE_KEY, sid);
  return sid;
}

function buildUrl(
  endpoint: string,
  path: string,
  measurementId: string,
  apiSecret?: string,
): string {
  const base = endpoint.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
  const qs = new URLSearchParams({ measurement_id: measurementId });
  if (apiSecret) qs.set("api_secret", apiSecret);
  return `${base}?${qs.toString()}`;
}

function buildUserProperties(
  properties: UserProperties | null,
): Record<string, MPUserPropertyValue> | undefined {
  if (!properties) return undefined;
  const out: Record<string, MPUserPropertyValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key === "user_id" || value === undefined || value === null) continue;
    out[key] = { value };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sendPayload(url: string, body: string): void {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }
  if (typeof fetch === "function") {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // analytics must never throw
    });
  }
}

/**
 * Creates a server-side Google Tag Manager (sGTM) plugin instance.
 *
 * @remarks
 * On each `track()` call, the plugin:
 * 1. Builds a GA4 Measurement Protocol v2 JSON payload wrapping the
 *    GA4 event name and parameters, plus `event_id`
 *    (from {@link EventContext}), `session_id`, and `engagement_time_msec`.
 * 2. Includes `user_id` and `user_properties` when `setUser` has been called.
 * 3. POSTs the payload to `{endpoint}{path}?measurement_id=...&api_secret=...`
 *    via `navigator.sendBeacon` with `fetch` as fallback.
 *
 * Auto-generates and persists a `client_id` in `localStorage` on first use.
 * SSR-safe: all browser globals are guarded; `track()` is a no-op when
 * `window` is undefined or required config is missing.
 *
 * @returns An sGTM {@link FunnelPlugin} instance.
 *
 * @example
 * ```ts
 * import { Funnel } from "@sunwjy/funnel-core";
 * import { createSGTMPlugin } from "@sunwjy/funnel-client/sgtm";
 *
 * const funnel = new Funnel({
 *   plugins: [createSGTMPlugin()],
 * });
 *
 * funnel.initialize({
 *   sgtm: {
 *     endpoint: "https://sgtm.example.com",
 *     measurementId: "G-XXXXXXXXXX",
 *   },
 * });
 * ```
 */
export function createSGTMPlugin(): FunnelPlugin {
  let endpoint = "";
  let measurementId = "";
  let apiSecret: string | undefined;
  let path = DEFAULT_PATH;
  let clientIdOverride: string | undefined;
  let nonPersonalizedAds: boolean | undefined;
  let resolvedClientId = "";
  let storedUserProperties: UserProperties | null = null;

  return {
    name: "sgtm",

    initialize(config: Record<string, unknown>): void {
      const c = config as unknown as SGTMPluginConfig;
      if (c.endpoint) endpoint = c.endpoint;
      if (c.measurementId) measurementId = c.measurementId;
      apiSecret = c.apiSecret;
      path = c.path ?? DEFAULT_PATH;
      clientIdOverride = c.clientId;
      nonPersonalizedAds = c.nonPersonalizedAds;

      if (typeof window !== "undefined") {
        resolvedClientId = resolveClientId(clientIdOverride);
      }
    },

    setUser(properties: UserProperties): void {
      storedUserProperties = properties;
    },

    resetUser(): void {
      storedUserProperties = null;
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !endpoint || !measurementId) return;
      if (!resolvedClientId) resolvedClientId = resolveClientId(clientIdOverride);

      const eventParams: Record<string, unknown> = {
        ...(params as Record<string, unknown>),
        event_id: context.eventId,
        session_id: resolveSessionId(),
        engagement_time_msec: 100,
      };

      const payload: MPPayload = {
        client_id: resolvedClientId,
        timestamp_micros: Date.now() * 1000,
        events: [{ name: eventName, params: eventParams }],
      };

      if (storedUserProperties?.user_id) {
        payload.user_id = storedUserProperties.user_id;
      }

      const userProps = buildUserProperties(storedUserProperties);
      if (userProps) {
        payload.user_properties = userProps;
      }

      if (nonPersonalizedAds !== undefined) {
        payload.non_personalized_ads = nonPersonalizedAds;
      }

      sendPayload(buildUrl(endpoint, path, measurementId, apiSecret), JSON.stringify(payload));
    },
  };
}
