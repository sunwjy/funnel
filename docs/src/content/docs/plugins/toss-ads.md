---
title: Toss Ads
description: Send Funnel's GA4 events to the Toss Ads Pixel via window.TossPixel.
sidebar:
  order: 14
---

The Toss Ads plugin connects Funnel to **Toss Ads (토스애즈)**. It maps Funnel's GA4-standard
events into the Toss Pixel's standard events, dispatched through the `window.TossPixel`
instance. `window.TossPixel(conversionCode)` returns an object with one method per standard
event (`pageView`, `productView`, `purchase`, …).

## What it tracks

| Funnel event (GA4) | Toss Pixel method |
| --- | --- |
| `page_view` | `pageView` |
| `view_item` | `productView` |
| `add_to_cart` | `addToCart` |
| `add_to_wishlist` | `addToWishlist` |
| `begin_checkout` | `initiateCheckout` |
| `purchase` | `purchase` |
| `search` | `search` |
| `sign_up` | `signUp` |
| `login` | `signIn` |
| `generate_lead` | `lead` |

Events without a Toss equivalent (e.g. `view_item_list`, `select_item`, `remove_from_cart`,
`refund`) are silently dropped — Toss has no matching method and no custom-event channel.

## Before you start

- A **Toss Ads conversion code (전환 코드)**, issued per ad account in the Toss Ads dashboard.
- The Toss Pixel base snippet loaded in your page, so `window.TossPixel` exists before Funnel
  runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createTossAdsPlugin } from "@sunwjy/funnel-client/toss-ads";

export const funnel = new Funnel({
  plugins: [createTossAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "toss-ads": { conversionCode: "your_conversion_code" },
});
```

`consentRequired: true` is optional — when set, events are dropped until `ad_storage` is
granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-5005",
  items: [{ item_id: "SKU-1", item_name: "T-shirt", price: 29000, quantity: 1 }],
});
```

This calls the pixel's `purchase({ order_id: "T-5005", revenue: 29000, total_quantity: 1, currency: "KRW", products: [...], custom_param1: "<eventId>" })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Confirm `window.TossPixel` exists in DevTools and watch the Network tab for pixel requests.
- Check conversions in the Toss Ads dashboard (allow time for processing).

## Notes

- **SSR safe.** When `window` (or `window.TossPixel`) is absent, the plugin does nothing.
- Toss Pixel has **no native dedup ID field**. Funnel forwards `eventId` via `custom_param1`
  for server-side reconciliation; `order_id` is set from `transaction_id` on
  purchase/checkout.
- Default currency is **KRW** when `currency` is not provided.
- No user-identification API is exposed by Toss, so `setUser` is intentionally not implemented.
