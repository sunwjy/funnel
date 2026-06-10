/**
 * Playwright route-intercept helpers.
 *
 * All collection routes use route.fulfill({ status: 200 }) — never abort.
 * Captured requests are returned as arrays for assertion in spec files.
 */

import type { Page, Request, Route } from "@playwright/test";
import { expect } from "@playwright/test";
import { extractGa4Events, parseCapiBody } from "./parse.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapturedGa4Request {
  url: string;
  postDataBuffer: Buffer | null;
}

export interface CapturedCapiPayload {
  // raw fields from the JSON body
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: string;
  user_data: Record<string, unknown>;
  custom_data: Record<string, unknown>;
  test_event_code?: string;
}

// ---------------------------------------------------------------------------
// GA4 — route glob: **/g/collect*
// ---------------------------------------------------------------------------

/**
 * Registers a route handler for GA4 collection requests (glob: g/collect path).
 *
 * GA4 (gtag.js) can batch multiple events into a single POST whose body
 * contains newline-delimited `en=...` segments. Both the URL query string and
 * the POST body are stored so `extractGa4Events` can union all `en` values
 * across all captured requests.
 *
 * @returns Mutable array that accumulates captured requests during the test.
 */
export async function interceptGa4(page: Page): Promise<CapturedGa4Request[]> {
  const captured: CapturedGa4Request[] = [];

  await page.route("**/g/collect*", async (route: Route) => {
    const request: Request = route.request();
    let buf: Buffer | null = null;
    try {
      buf = await request.postDataBuffer();
    } catch {
      // No body — query-string only hit.
    }
    captured.push({ url: request.url(), postDataBuffer: buf });
    await route.fulfill({ status: 200, body: "" });
  });

  return captured;
}

/**
 * Polls until the union of `en` values across all captured GA4 requests
 * contains the expected event names, or the timeout expires.
 *
 * Uses `expect.poll` so timing is handled by Playwright's built-in retry loop
 * rather than a fixed sleep — this absorbs the ~5 s batching buffer.
 */
export async function waitForGa4Events(
  captured: CapturedGa4Request[],
  expected: string[],
  timeoutMs = 15_000,
): Promise<void> {
  await expect
    .poll(
      () => {
        const found = new Set<string>();
        for (const req of captured) {
          for (const name of extractGa4Events(req.url, req.postDataBuffer)) {
            found.add(name);
          }
        }
        return [...found];
      },
      { timeout: timeoutMs },
    )
    .toEqual(expect.arrayContaining(expected));
}

// ---------------------------------------------------------------------------
// GTM — route glob: **/gtm.js*
// ---------------------------------------------------------------------------

/**
 * Registers a route handler that observes GTM script loads (glob: gtm.js path).
 * The script is passed through (not blocked) so the container actually loads.
 *
 * @returns Array of observed GTM script URLs.
 */
export async function interceptGtm(page: Page): Promise<string[]> {
  const observed: string[] = [];

  await page.route("**/gtm.js*", async (route: Route) => {
    observed.push(route.request().url());
    // Let the script through so the container initialises.
    await route.continue();
  });

  return observed;
}

/**
 * Returns the `window.dataLayer` array from the page.
 * Assertion must use `find(e => e.event === name)` — never index-based access
 * because GTM inserts an `{ ecommerce: null }` entry before each ecommerce
 * event.
 */
export async function getDataLayer(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => {
    // window.dataLayer may contain non-plain objects from GTM internals.
    return JSON.parse(
      JSON.stringify((window as unknown as { dataLayer: unknown[] }).dataLayer ?? []),
    );
  });
}

// ---------------------------------------------------------------------------
// Meta Pixel — RegExp intercept for facebook.com/tr pixel hits
// ---------------------------------------------------------------------------

export interface CapturedPixelRequest {
  url: string;
}

/**
 * Registers a route handler for Meta Pixel collection requests.
 *
 * fbevents.js fires pixel hits as GET requests to
 * https://www.facebook.com/tr/?id=...&ev=...
 *
 * A RegExp is required instead of a glob — Playwright glob patterns do not
 * match URLs where the query string immediately follows the path segment
 * without a trailing slash (e.g. "/tr?" is not matched by glob "*\/tr*").
 * The RegExp /facebook\.com\/tr/ reliably captures all variants.
 *
 * Prerequisite: the fixture pixel ID must be non-zero.  fbevents.js silently
 * rejects all-zero IDs ("Invalid PixelID") and skips both init and /tr
 * requests.  fixtures.ts META_PIXEL_ID is set to "123456789012345".
 *
 * @returns Mutable array of captured pixel request URLs.
 */
export async function interceptMetaPixel(page: Page): Promise<CapturedPixelRequest[]> {
  const captured: CapturedPixelRequest[] = [];

  await page.route(/facebook\.com\/tr/, async (route: Route) => {
    captured.push({ url: route.request().url() });
    await route.fulfill({ status: 200, body: "" });
  });

  return captured;
}

// ---------------------------------------------------------------------------
// Meta CAPI — same-origin /__capi (sendBeacon primary path)
// ---------------------------------------------------------------------------

/**
 * Registers a route handler for CAPI POST requests to the same-origin
 * /__capi endpoint.
 *
 * Body capture MUST use `request.postDataBuffer()` — Playwright's
 * `request.postData()` returns `null` for sendBeacon Blob bodies
 * (Playwright issues #24077 / #6479).
 *
 * @returns Mutable array of decoded CAPI payloads.
 */
export async function interceptCapi(page: Page): Promise<CapturedCapiPayload[]> {
  const captured: CapturedCapiPayload[] = [];

  await page.route("**/__capi", async (route: Route) => {
    const request: Request = route.request();
    let payload: CapturedCapiPayload | null = null;
    try {
      const buf = await request.postDataBuffer();
      if (buf) {
        payload = parseCapiBody(buf);
      }
    } catch {
      // Parsing failed — still fulfill so the SDK doesn't retry.
    }
    if (payload) captured.push(payload);
    await route.fulfill({ status: 200, body: "{}" });
  });

  return captured;
}
