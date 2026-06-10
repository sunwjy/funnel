/**
 * Consent fixture page — loads GA4, Meta Pixel, and Meta CAPI plugins with
 * consentRequired:true on CAPI. Provides buttons to grant/deny consent and
 * fire events so the consent spec can assert on suppression vs. dispatch.
 */

import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaConversionApiPlugin } from "@sunwjy/funnel-client/meta-conversion-api";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { Funnel } from "@sunwjy/funnel-core";
import {
  FIXTURE_CURRENCY,
  FIXTURE_ITEM,
  FIXTURE_TRANSACTION_ID,
  FIXTURE_USER,
  FIXTURE_VALUE,
  GA4_MEASUREMENT_ID,
  META_CAPI_ENDPOINT,
  META_PIXEL_ID,
} from "./fixtures.js";

const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin(), createMetaConversionApiPlugin()],
});

funnel.initialize({
  ga4: { measurementId: GA4_MEASUREMENT_ID },
  "meta-pixel": { pixelId: META_PIXEL_ID },
  "meta-conversion-api": {
    endpoint: META_CAPI_ENDPOINT,
    consentRequired: true,
  },
});

function wire(id: string, handler: () => void): void {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

wire("track-view_item", () => {
  funnel.track("view_item", {
    currency: FIXTURE_CURRENCY,
    value: FIXTURE_VALUE,
    items: [{ ...FIXTURE_ITEM }],
  });
});

wire("track-add_to_cart", () => {
  funnel.track("add_to_cart", {
    currency: FIXTURE_CURRENCY,
    value: FIXTURE_VALUE,
    items: [{ ...FIXTURE_ITEM }],
  });
});

wire("track-begin_checkout", () => {
  funnel.track("begin_checkout", {
    currency: FIXTURE_CURRENCY,
    value: FIXTURE_VALUE,
    items: [{ ...FIXTURE_ITEM }],
  });
});

wire("track-purchase", () => {
  funnel.track("purchase", {
    currency: FIXTURE_CURRENCY,
    value: FIXTURE_VALUE,
    transaction_id: FIXTURE_TRANSACTION_ID,
    items: [{ ...FIXTURE_ITEM }],
  });
});

wire("set-user", () => {
  funnel.setUser({ ...FIXTURE_USER });
});

wire("consent-grant", () => {
  funnel.setConsent({ ad_storage: "granted", analytics_storage: "granted" });
});

wire("consent-deny", () => {
  funnel.setConsent({ ad_storage: "denied", analytics_storage: "denied" });
});
