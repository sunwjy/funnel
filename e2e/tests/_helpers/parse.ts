/**
 * Request-body / query-string parsers for GA4, Meta Pixel, and Meta CAPI.
 *
 * All SDK-derived serialisation assumptions (e.g. fbevents.js `cd[*]` keys)
 * are managed here so they can be updated in one place (plan risk R2).
 */

// ---------------------------------------------------------------------------
// GA4
// ---------------------------------------------------------------------------

/**
 * Extracts all `en` (event name) values from a single GA4 collection request.
 *
 * gtag.js may:
 *   1. Send individual hits via query string  (?en=view_item&...)
 *   2. Batch multiple hits in a POST body as newline-delimited param strings
 *      (each line is its own URL-encoded segment containing `en=...`)
 *
 * Both cases are handled here. The caller unions results across all captured
 * requests to build the full set of dispatched event names.
 */
export function extractGa4Events(requestUrl: string, postDataBuffer: Buffer | null): string[] {
  const names = new Set<string>();

  // 1. Query-string path (single-hit GETs and the query component of POSTs).
  try {
    const qs = new URL(requestUrl).searchParams;
    const en = qs.get("en");
    if (en) names.add(en);
  } catch {
    // Malformed URL — skip.
  }

  // 2. POST body path (batched hits).
  if (postDataBuffer) {
    const body = postDataBuffer.toString("utf-8");
    // Each line in the batch is a URL-encoded key-value string.
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const params = new URLSearchParams(trimmed);
        const en = params.get("en");
        if (en) names.add(en);
      } catch {
        // Not a valid param string — skip.
      }
    }
  }

  return [...names];
}

/**
 * Extracts a named GA4 parameter from a captured request.
 *
 * Searches the query string first; falls back to the first matching line in
 * the POST body for batched requests.
 */
export function extractGa4Param(
  requestUrl: string,
  postDataBuffer: Buffer | null,
  paramName: string,
): string | null {
  // Query string.
  try {
    const val = new URL(requestUrl).searchParams.get(paramName);
    if (val !== null) return val;
  } catch {
    // Skip.
  }

  // POST body.
  if (postDataBuffer) {
    const body = postDataBuffer.toString("utf-8");
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const val = new URLSearchParams(trimmed).get(paramName);
        if (val !== null) return val;
      } catch {
        // Skip.
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Meta Pixel
// ---------------------------------------------------------------------------

/**
 * Parsed representation of a Meta Pixel (`/tr`) request.
 *
 * Key names are derived from fbevents.js serialisation — our plugin only calls
 * `fbq("track", name, params, { eventID })` and fbevents.js decides the wire
 * format. These names are best-effort and may drift with SDK updates (R2).
 */
export interface ParsedPixelRequest {
  /** Mapped standard event name (e.g. "ViewContent", "AddToCart"). */
  ev: string | null;
  /** eventID forwarded from EventContext for deduplication. */
  eid: string | null;
  /** currency (fbevents.js serialises as `cd[currency]`). */
  currency: string | null;
  /** value (fbevents.js serialises as `cd[value]`). */
  value: string | null;
  /** content_ids JSON string (fbevents.js: `cd[content_ids]`). */
  contentIds: string | null;
  /** contents JSON string (fbevents.js: `cd[contents]`). */
  contents: string | null;
  /** num_items (fbevents.js: `cd[num_items]`). */
  numItems: string | null;
}

/**
 * Parses a Meta Pixel request URL into the named fields we assert on.
 *
 * All values are strings as they appear in the query string (fbevents.js does
 * not JSON-encode scalar values, only arrays/objects). Callers should do their
 * own type coercion when asserting numeric fields.
 */
export function parsePixelRequest(requestUrl: string): ParsedPixelRequest {
  let qs: URLSearchParams;
  try {
    qs = new URL(requestUrl).searchParams;
  } catch {
    qs = new URLSearchParams();
  }

  return {
    ev: qs.get("ev"),
    eid: qs.get("eid"),
    currency: qs.get("cd[currency]"),
    value: qs.get("cd[value]"),
    contentIds: qs.get("cd[content_ids]"),
    contents: qs.get("cd[contents]"),
    numItems: qs.get("cd[num_items]"),
  };
}

// ---------------------------------------------------------------------------
// Meta CAPI
// ---------------------------------------------------------------------------

/**
 * Decodes a raw `postDataBuffer` from a CAPI `/__capi` request.
 *
 * Must use Buffer (not `request.postData()`) because sendBeacon sends a Blob
 * and Playwright's string accessor returns null for Blob bodies
 * (issues #24077 / #6479).
 */
export function parseCapiBody(buf: Buffer): {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: string;
  user_data: Record<string, unknown>;
  custom_data: Record<string, unknown>;
  test_event_code?: string;
} {
  const json = buf.toString("utf-8");
  return JSON.parse(json);
}
