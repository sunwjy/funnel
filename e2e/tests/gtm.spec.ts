/**
 * GTM e2e spec — AC-2
 *
 * Verifies GTM plugin behaviour:
 *   1. Each funnel event is pushed to window.dataLayer and can be found by
 *      event name (find-based, never index-based — ecommerce events are
 *      preceded by an `{ ecommerce: null }` clear push).
 *   2. The GTM container script (glob: gtm.js path) is actually requested.
 *
 * AC-2 3rd tier (collection request assertions) is explicitly deferred until
 * a published test container with a GA4 tag is available (see plan ADR).
 */

import { expect, test } from "@playwright/test";
import { getDataLayer, interceptGtm } from "./_helpers/intercept.js";

const ECOMMERCE_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

test.describe("GTM plugin", () => {
  test("pushes all four ecommerce events to dataLayer with correct structure", async ({ page }) => {
    const observedGtmRequests = await interceptGtm(page);

    await page.goto("/pages/gtm.html");

    // GTM-TEST000 is a non-existent container so gtm.js returns 404.
    // The dataLayer plugin pushes directly to window.dataLayer without
    // depending on the container script, so we can fire events immediately.
    // The interceptGtm helper already records the gtm.js request via
    // page.route — no waitForResponse gate needed.

    // Fire all four events.
    for (const eventName of ECOMMERCE_EVENTS) {
      await page.click(`#track-${eventName}`);
    }

    // AC-2 — 1st tier: dataLayer find assertions.
    const dataLayer = await getDataLayer(page);

    for (const eventName of ECOMMERCE_EVENTS) {
      // Must use find — never index/at(-1): ecommerce events have a preceding
      // `{ ecommerce: null }` clear entry that shifts indices.
      const entry = dataLayer.find((e) => e.event === eventName);

      expect(entry, `dataLayer entry for "${eventName}" not found`).toBeDefined();

      // event_id must be present on every entry.
      expect(entry?.event_id, `event_id missing for "${eventName}"`).toBeTruthy();

      // Ecommerce events must carry the ecommerce wrapper with currency/value/items.
      const ecommerce = entry?.ecommerce as Record<string, unknown> | undefined;
      expect(
        ecommerce,
        `ecommerce object missing for ecommerce event "${eventName}"`,
      ).toBeDefined();
      expect(ecommerce?.currency).toBe("KRW");
      expect(ecommerce?.value).toBe(89000);
      expect(Array.isArray(ecommerce?.items)).toBe(true);
    }

    // AC-2 — 2nd tier: GTM container script was requested.
    expect(
      observedGtmRequests.length,
      "GTM container script (gtm.js) was not requested",
    ).toBeGreaterThan(0);
    expect(observedGtmRequests[0]).toContain("gtm.js");
  });

  test("pushes ecommerce: null before each ecommerce event", async ({ page }) => {
    await interceptGtm(page);
    await page.goto("/pages/gtm.html");

    await page.click("#track-view_item");

    const dataLayer = await getDataLayer(page);

    // Find the view_item entry and verify the entry immediately before it is
    // the ecommerce: null clear push.
    const viewItemIndex = dataLayer.findIndex((e) => e.event === "view_item");
    expect(viewItemIndex).toBeGreaterThan(0);

    const precedingEntry = dataLayer[viewItemIndex - 1];
    expect(precedingEntry).toEqual({ ecommerce: null });
  });
});
