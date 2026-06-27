---
title: Reddit Pixel
description: Send Funnel's GA4 events to the Reddit Pixel via window.rdt.
sidebar:
  order: 15
---

The Reddit Pixel plugin connects Funnel to **Reddit Ads**. It maps Funnel's GA4-standard
events into the Reddit Pixel's standard events and dispatches them through `window.rdt`.
Unmapped events are sent as `Custom` events with the original GA4 name preserved.

## What it tracks

| Funnel event (GA4) | Reddit Pixel event |
| --- | --- |
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `add_to_wishlist` | `AddToWishlist` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `SignUp` |
| `search` | `Search` |

Any other event is sent as `rdt("track", "Custom", { ..., customEventName: "<ga4 name>" })`.
Every event includes `conversionId` (Funnel's `eventId`) so it can be deduplicated against
Reddit's Conversions API (CAPI).

## Before you start

- A **Reddit Pixel (advertiser) ID** from Reddit Ads.
- The Reddit Pixel base snippet loaded in your page, so `window.rdt` exists before Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createRedditPixelPlugin } from "@sunwjy/funnel-client/reddit-pixel";

export const funnel = new Funnel({
  plugins: [createRedditPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "reddit-pixel": { pixelId: "t2_abc123" },
});
```

`consentRequired: true` is optional. When set, events are dropped until `ad_storage` is
granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 75,
  transaction_id: "T-6006",
});
```

This calls `rdt("track", "Purchase", { currency: "USD", value: 75, transactionId: "T-6006", conversionId: "..." })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Install the **Reddit Pixel Helper** browser extension to inspect events as they fire.
- Confirm `window.rdt` exists in DevTools and watch the Network tab for requests to
  `events.reddit.com`.

## Notes

- **SSR safe.** When `window` (or `window.rdt`) is absent, the plugin does nothing.
- Per-item `id`/`name`/`category` are sent as a `products` array, plus an aggregated
  `itemCount`.
- `conversionId` is set from Funnel's `eventId` on every event. Pair it with Reddit CAPI to
  deduplicate browser and server conversions.
