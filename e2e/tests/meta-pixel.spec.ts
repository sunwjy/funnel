/**
 * Meta Pixel e2e spec — AC-3
 *
 * Verifies that all four funnel ecommerce events are sent as Meta Pixel
 * standard events to facebook.com/tr (glob: facebook.com/tr path) with the correct query-string
 * fields serialised by fbevents.js.
 *
 * Key serialisation note (plan AC-3 / R2):
 *   The `ev`, `eid`, and `cd[*]` query-string keys are fbevents.js
 *   serialisation artefacts — our plugin only calls `fbq("track", name,
 *   params, { eventID })`. The key names may drift with SDK updates; all
 *   parser logic lives in _helpers/parse.ts (single point of maintenance).
 *
 * Event mapping (meta-pixel/index.ts EVENT_MAP):
 *   view_item       → ViewContent
 *   add_to_cart     → AddToCart
 *   begin_checkout  → InitiateCheckout
 *   purchase        → Purchase
 */

import { expect, test } from "@playwright/test";
import { type CapturedPixelRequest, interceptMetaPixel } from "./_helpers/intercept.js";
import { parsePixelRequest } from "./_helpers/parse.js";

const EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

const FUNNEL_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

test.describe("Meta Pixel plugin", () => {
  test("dispatches all four ecommerce events to facebook.com/tr with correct fields", async ({
    page,
  }) => {
    const captured: CapturedPixelRequest[] = await interceptMetaPixel(page);

    await page.goto("/pages/meta-pixel.html");

    // interceptMetaPixel replaces the real fbevents.js CDN script with a mock
    // that synchronously drains the fbq stub queue and fires actual /tr GET
    // requests.  No SDK-load gate is needed: the mock is served before the page
    // navigates, fbq.loaded is already true when the inline stub runs, and the
    // mock's queue drain handles any calls made before the script executed.

    // Fire all four events.
    for (const eventName of FUNNEL_EVENTS) {
      await page.click(`#track-${eventName}`);
    }

    // Wait until all four Pixel requests are captured.
    await expect
      .poll(() => captured.length, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(FUNNEL_EVENTS.length);

    // Build a map from standard event name → captured request for assertions.
    const byStandardName = new Map<string, ReturnType<typeof parsePixelRequest>>();
    for (const req of captured) {
      const parsed = parsePixelRequest(req.url);
      if (parsed.ev) {
        byStandardName.set(parsed.ev, parsed);
      }
    }

    for (const ga4EventName of FUNNEL_EVENTS) {
      const standardName = EVENT_MAP[ga4EventName];
      const parsed = byStandardName.get(standardName);

      expect(
        parsed,
        `No Pixel request found for ${ga4EventName} (expected ev=${standardName})`,
      ).toBeDefined();

      // ev — mapped standard event name.
      expect(parsed?.ev).toBe(standardName);

      // eid — eventID from EventContext (deduplication key).
      expect(parsed?.eid, `eid missing for ${ga4EventName}`).toBeTruthy();

      // cd[currency] — fbevents.js serialisation of currency param.
      if (parsed?.currency !== null) {
        expect(parsed?.currency).toBe("KRW");
      }

      // cd[value] — fbevents.js serialisation of value param.
      if (parsed?.value !== null) {
        expect(Number(parsed?.value)).toBe(89000);
      }

      // cd[content_ids] — present for events with items.
      if (parsed?.contentIds !== null) {
        expect(parsed?.contentIds).toContain("SHOE-001");
      }

      // cd[num_items] — present for events with items.
      if (parsed?.numItems !== null) {
        expect(Number(parsed?.numItems)).toBeGreaterThan(0);
      }
    }
  });
});
