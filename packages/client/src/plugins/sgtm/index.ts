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
import { postJson } from "../../internal/transport.js";

/**
 * Configuration for the sGTM plugin.
 */
export interface SGTMPluginConfig {
  /** Base URL of the sGTM container (e.g., `"https://sgtm.example.com"`). */
  endpoint: string;
  /** GA4 Measurement ID (e.g., `"G-XXXXXXXXXX"`). */
  measurementId: string;
  /**
   * GA4 Measurement Protocol API secret.
   *
   * @remarks
   * Setting this in browser code exposes the secret in DevTools, proxy logs,
   * and CDN access logs. The plugin REJECTS this option unless
   * {@link allowApiSecretInBrowser} is also set to `true`. The recommended
   * configuration is to leave `apiSecret` unset and have your sGTM container
   * skip api_secret validation for browser traffic.
   */
  apiSecret?: string;
  /**
   * Required acknowledgement to forward {@link apiSecret} from the browser.
   *
   * @remarks
   * The plugin will not include `api_secret` in the request URL unless this
   * flag is explicitly `true`, and emits a `console.error` reminding callers
   * of the leak surface (DevTools, referrer, CDN logs).
   */
  allowApiSecretInBrowser?: boolean;
  /** Path appended to the endpoint (default: `"/mp/collect"`). */
  path?: string;
  /**
   * Override for the `client_id` value.
   *
   * @remarks
   * When omitted, a UUID is generated and persisted in `localStorage`
   * (key `_funnel_sgtm_cid`).
   */
  clientId?: string;
  /** Sets the `non_personalized_ads` flag on every event. */
  nonPersonalizedAds?: boolean;
  /**
   * Value forwarded as the GA4 `engagement_time_msec` event param.
   *
   * @remarks
   * GA4 uses this for engaged-session and average-engagement-time metrics.
   * Default: `1` (a single ms — minimal influence on metrics). Set explicitly
   * if you measure real engagement. The previous default of `100` polluted
   * GA4 engagement metrics.
   */
  engagementTimeMsec?: number;
}

const CLIENT_ID_STORAGE_KEY = "_funnel_sgtm_cid";
const SESSION_ID_STORAGE_KEY = "_funnel_sgtm_sid";
const SESSION_LAST_ACTIVITY_KEY = "_funnel_sgtm_sla";
const DEFAULT_PATH = "/mp/collect";
const DEFAULT_ENGAGEMENT_TIME_MSEC = 1;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — GA4 default

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
  const now = Date.now();
  const existing = readStorage(storage, SESSION_ID_STORAGE_KEY);
  const lastActivity = Number(readStorage(storage, SESSION_LAST_ACTIVITY_KEY) ?? "0");
  const idleExpired = !existing || now - lastActivity > SESSION_IDLE_TIMEOUT_MS;

  let sid: string;
  if (existing && !idleExpired) {
    sid = existing;
  } else {
    sid = Math.floor(now / 1000).toString();
    writeStorage(storage, SESSION_ID_STORAGE_KEY, sid);
  }
  writeStorage(storage, SESSION_LAST_ACTIVITY_KEY, String(now));
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

/**
 * Creates a server-side Google Tag Manager (sGTM) plugin instance.
 */
export function createSGTMPlugin(): FunnelPlugin {
  let endpoint = "";
  let measurementId = "";
  let apiSecret: string | undefined;
  let path = DEFAULT_PATH;
  let clientIdOverride: string | undefined;
  let nonPersonalizedAds: boolean | undefined;
  let engagementTimeMsec = DEFAULT_ENGAGEMENT_TIME_MSEC;
  let resolvedClientId = "";
  let storedUserProperties: UserProperties | null = null;

  return {
    name: "sgtm",

    initialize(config: Record<string, unknown>): void {
      const c = config as unknown as SGTMPluginConfig;
      if (c.endpoint) endpoint = c.endpoint;
      if (c.measurementId) measurementId = c.measurementId;

      if (c.apiSecret) {
        if (c.allowApiSecretInBrowser === true) {
          apiSecret = c.apiSecret;
        } else {
          apiSecret = undefined;
          console.error(
            "[funnel/sgtm] apiSecret was provided but allowApiSecretInBrowser is not true; the secret will NOT be sent. Putting api_secret in browser traffic exposes it in DevTools, proxy logs, and CDN access logs. Prefer skipping api_secret validation in your sGTM container; or set allowApiSecretInBrowser: true to acknowledge the risk.",
          );
        }
      } else {
        apiSecret = undefined;
      }

      path = c.path ?? DEFAULT_PATH;
      clientIdOverride = c.clientId;
      nonPersonalizedAds = c.nonPersonalizedAds;
      engagementTimeMsec = c.engagementTimeMsec ?? DEFAULT_ENGAGEMENT_TIME_MSEC;

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
        engagement_time_msec: engagementTimeMsec,
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

      postJson(buildUrl(endpoint, path, measurementId, apiSecret), JSON.stringify(payload));
    },
  };
}
