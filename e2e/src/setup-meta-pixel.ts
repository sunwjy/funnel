import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { Funnel } from "@sunwjy/funnel-core";
import {
  FIXTURE_CURRENCY,
  FIXTURE_ITEM,
  FIXTURE_TRANSACTION_ID,
  FIXTURE_USER,
  FIXTURE_VALUE,
  META_PIXEL_ID,
} from "./fixtures.js";

const funnel = new Funnel({
  plugins: [createMetaPixelPlugin()],
});

funnel.initialize({
  "meta-pixel": { pixelId: META_PIXEL_ID },
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
  funnel.setConsent({ ad_storage: "granted" });
});

wire("consent-deny", () => {
  funnel.setConsent({ ad_storage: "denied" });
});
