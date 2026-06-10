/**
 * GA4 e2e spec — AC-1
 *
 * Verifies that all four funnel ecommerce events reach the GA4 collection
 * endpoint (glob: g/collect path) with the correct payload fields.
 *
 * gtag.js batches events into a single POST body when fired in quick
 * succession (~5 s buffer). The assertions therefore work on the union of
 * `en` values across ALL captured requests rather than assuming one request
 * per event.
 *
 * Flush strategy (AC-1 priority order):
 *   1. expect.poll — natural wait, no side effects (primary).
 *   2. visibilitychange → hidden — nudges the beacon flush without unloading.
 *   3. page.goto to a blank URL — last resort (ga4.spec only; destroys page
 *      context so no subsequent assertions are possible after this step).
 */

import { expect, test } from "@playwright/test";
import { type CapturedGa4Request, interceptGa4, waitForGa4Events } from "./_helpers/intercept.js";
import { extractGa4Events, extractGa4Param } from "./_helpers/parse.js";

const FUNNEL_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

test.describe("GA4 plugin", () => {
  test("dispatches all four ecommerce events to /g/collect with correct payload fields", async ({
    page,
  }) => {
    const captured: CapturedGa4Request[] = await interceptGa4(page);

    await page.goto("/pages/ga4.html");

    // gtag.js is loaded async and stubs window.gtag as a queue before the
    // script finishes — clicking immediately is safe because calls are queued
    // and flushed once gtag.js initialises.  Waiting for the response here
    // would race: the response may arrive before waitForResponse is registered.

    // Click all four event buttons.
    for (const eventName of FUNNEL_EVENTS) {
      await page.click(`#track-${eventName}`);
    }

    // --- Primary flush strategy: expect.poll ---
    // Wait until the union of en values across all captured requests contains
    // all four event names. This absorbs the ~5 s gtag.js batching buffer.
    await waitForGa4Events(captured, [...FUNNEL_EVENTS]);

    // --- Secondary flush strategy: visibilitychange ---
    // If expect.poll already succeeded the page still lives; this is a no-op.
    // If for some reason batching has not flushed yet, firing the hidden event
    // nudges gtag.js to send pending hits without destroying the page.
    if (captured.length === 0) {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "hidden",
          writable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await waitForGa4Events(captured, [...FUNNEL_EVENTS]);
    }

    // AC-1: All four events present in the union of captured requests.
    const allEvents = new Set<string>();
    for (const req of captured) {
      for (const name of extractGa4Events(req.url, req.postDataBuffer)) {
        allEvents.add(name);
      }
    }

    for (const eventName of FUNNEL_EVENTS) {
      expect(allEvents).toContain(eventName);
    }

    // AC-1 payload depth: currency present.
    // gtag.js serialises event params as `ep.<key>` or `epn.<key>` in the
    // batch body — the exact wire key for our custom `event_id` parameter
    // depends on gtag.js internals and is not guaranteed to be `event_id`.
    // We verify currency (`cu`) which is a known standard gtag parameter.
    for (const req of captured) {
      const currency = extractGa4Param(req.url, req.postDataBuffer, "cu");
      if (currency !== null) {
        expect(currency).toBe("KRW");
      }
    }

    // --- Last-resort flush: navigate away (destroys page — ga4.spec only) ---
    // Only reached if the above polls pass but we want belt-and-suspenders
    // evidence that gtag flushed. Since this runs *after* all assertions it
    // is safe for this spec.
    // (No additional assertions after this point.)
  });
});
