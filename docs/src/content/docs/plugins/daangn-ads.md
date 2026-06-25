---
title: Daangn Ads
description: Send Funnel's GA4 events to Daangn Business conversion tracking via window.karrotPixel.
sidebar:
  order: 16
---

The Daangn Ads plugin connects Funnel to **Daangn Business (당근비즈니스) conversion tracking
(전환 추적 코드)**. It maps Funnel's GA4-standard events into Daangn's standard conversion
events, dispatched through `window.karrotPixel`.

## What it tracks

| Funnel event (GA4) | Daangn event |
| --- | --- |
| `page_view` | `ViewPage` |
| `view_item` | `ViewContent` (first item's `id`) |
| `add_to_cart` | `AddToCart` (`products`) |
| `sign_up` | `CompleteRegistration` |
| `purchase` | `Purchase` (`total_price`, `total_quantity`, `products`) |

Daangn's pixel exposes only this fixed set of standard events — there is no custom-event API.
Unmapped GA4 events (e.g. `view_item_list`, `select_item`, `search`, `refund`) are silently
dropped.

## Before you start

- A **Daangn 전환 추적 코드 ID (conversion tracking code ID)**, issued in 당근비즈니스 → 광고도구
  → 전환 추적 관리.
- The Daangn pixel loader in your page
  (`https://karrot-pixel.business.daangn.com/0.2/karrot-pixel.umd.js`), so `window.karrotPixel`
  exists before Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createDaangnAdsPlugin } from "@sunwjy/funnel-client/daangn-ads";

export const funnel = new Funnel({
  plugins: [createDaangnAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "daangn-ads": { trackId: "your_track_id" },
});
```

`consentRequired: true` is optional — when set, events are dropped until `ad_storage` is
granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 15000,
  transaction_id: "T-7007",
  items: [{ item_id: "SKU-9", item_name: "Mug", price: 15000, quantity: 1 }],
});
```

This calls `karrotPixel.track("Purchase", { total_price: "15000", total_quantity: "1", products: [{ id: "SKU-9", name: "Mug", quantity: 1, price: 15000 }] })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Confirm `window.karrotPixel` exists in DevTools and watch the Network tab for pixel requests.
- Check conversions in 당근비즈니스 → 전환 추적 관리 (allow time for processing).

## Notes

- **SSR safe.** When `window` (or `window.karrotPixel`) is absent, the plugin does nothing.
- `Purchase` totals (`total_price`, `total_quantity`) are sent as **strings**, per Daangn's
  snippet contract. `total_price` is computed from per-item `price × quantity`, falling back to
  the GA4 top-level `value` when per-item pricing is unavailable.
- Daangn's pixel has **no client/server event-ID or deduplication parameter**, so Funnel's
  `eventId` is not forwarded.
- No user-identification API is exposed, so `setUser` is intentionally not implemented.
