---
title: TikTok Pixel
description: Map Funnel's GA4 events to TikTok Pixel standard events via window.ttq.
sidebar:
  order: 7
---

The TikTok Pixel plugin transforms Funnel's GA4-based events into **TikTok Pixel** standard
events and sends them through `window.ttq`.

## What it tracks

`page_view` calls `ttq.page()`. Mapped GA4 events become TikTok standard events. For example,
`purchase` → `CompletePayment`, `add_to_cart` → `AddToCart`, `begin_checkout` →
`InitiateCheckout`, `view_item` → `ViewContent`, `sign_up` → `CompleteRegistration`,
`generate_lead` → `SubmitForm`, and `search` → `Search`. GA4 `items` become TikTok `contents`.
Events not in the mapping are sent as custom events via `ttq.track(<eventName>, ...)`. Every call
carries `event_id` for deduplication.

## Before you start

- A **TikTok Pixel ID** from TikTok Ads Manager.
- The standard TikTok Pixel base code loaded in your page so `window.ttq` exists before Funnel
  runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";

export const funnel = new Funnel({
  plugins: [createTikTokPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "tiktok-pixel": { pixelId: "CXXXXXXXXXXXXXXXXXXX" },
});
```

## Track an event

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 29000, quantity: 1 }],
});
```

This fires `ttq.track("CompletePayment", { contents, currency, value, order_id, event_id })`.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Install the **TikTok Pixel Helper** browser extension to watch events fire.
- Use **Test Events** in TikTok Events Manager.

## Notes

- **SSR-safe**: every method returns early when `window` or `window.ttq` is missing.
- `select_item` is intentionally **not** mapped: TikTok's `ClickButton` is for non-product CTAs,
  so PLP clicks fall through to a custom event instead of inflating that counter.
- `setUser` calls `ttq.identify({ email, phone_number, external_id })` for advanced matching.
  TikTok exposes no "un-identify" call, so this plugin implements no `resetUser`. Reload the
  page after logout if needed.
- Set `consentRequired: true` to drop events until `ad_storage` is granted via `setConsent`. The
  default is no gating (platform delegation).
