/**
 * Shared fixture constants for the e2e test suite.
 *
 * Test IDs are intentionally fake / non-live values so no real data is ever
 * sent to external platforms. The CAPI endpoint is always same-origin so that
 * `navigator.sendBeacon` succeeds and Playwright can intercept the request.
 */

export const GA4_MEASUREMENT_ID = "G-TEST000000";
export const GTM_CONTAINER_ID = "GTM-TEST000";
// Non-zero fake ID required: fbevents.js rejects all-zero IDs ("Invalid PixelID")
// and silently skips init + /tr requests. Real traffic is blocked by Playwright route intercept.
export const META_PIXEL_ID = "123456789012345";

/**
 * CAPI endpoint is a same-origin relative path.
 *
 * Keeping it relative ensures the browser resolves it against the fixture
 * page's own origin, which is the only way `navigator.sendBeacon` will
 * succeed (external/unknown hosts cause sendBeacon to return false and fall
 * through to the fetch-keepalive path, breaking the primary-path assertion).
 */
export const META_CAPI_ENDPOINT = "/__capi";

/** Fixed product used across all fixture pages. */
export const FIXTURE_ITEM = {
  item_id: "SHOE-001",
  item_name: "Classic Running Shoe",
  item_brand: "FunnelBrand",
  item_category: "Sports/Shoes",
  price: 89000,
  quantity: 1,
} as const;

/** Fixed purchase transaction ID for deterministic assertions. */
export const FIXTURE_TRANSACTION_ID = "TXN-E2E-001";

/** Fixture currency / value used by all ecommerce events. */
export const FIXTURE_CURRENCY = "KRW";
export const FIXTURE_VALUE = 89000;

/** Fixture user used by setUser tests. */
export const FIXTURE_USER = {
  user_id: "user-e2e-001",
  email: "e2e@example.com",
  phone_number: "+821012345678",
  first_name: "Jae",
  last_name: "Woo",
} as const;
