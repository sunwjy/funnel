---
title: Kakao Pixel
description: Map Funnel's GA4 events to Kakao Pixel standard events via window.kakaoPixel.
sidebar:
  order: 8
---

The Kakao Pixel plugin transforms Funnel's GA4-based events into **Kakao Pixel** standard events
through `window.kakaoPixel`.

## What it tracks

Each mapped GA4 event calls a dedicated Kakao Pixel method: `page_view` → `pageView()`,
`search` → `search()`, `view_item` → `viewContent()`, `add_to_cart` → `addToCart()`,
`begin_checkout` / `view_cart` → `viewCart()`, `purchase` → `purchase()`, `sign_up` →
`completeRegistration()`, `generate_lead` → `participation()`. For `purchase`, GA4 `items` are
mapped to Kakao `products`, and `total_price` is computed from per-item pricing (falling back to
the GA4 top-level `value`). Kakao Pixel has **no custom-event support and no deduplication**, so
unmapped events (`view_item_list`, `select_item`, `refund`, …) are silently dropped.

## Before you start

- A **Kakao Pixel Track ID** from Kakao Moment / Kakao Business.
- The standard Kakao Pixel base snippet loaded so `window.kakaoPixel` exists before Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createKakaoPixelPlugin } from "@sunwjy/funnel-client/kakao-pixel";

export const funnel = new Funnel({
  plugins: [createKakaoPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "kakao-pixel": { trackId: "1234567890123456789" },
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

This calls `kakaoPixel(trackId).purchase({ total_quantity, total_price, currency, products })`.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Use the Kakao Pixel & SDK debugging tools in Kakao's developer console.
- Inspect the `kakaoPixel` requests in the DevTools Network tab.

## Notes

- **SSR-safe**: `track` no-ops when `window` or `window.kakaoPixel` (or `trackId`) is missing.
- **No custom events / no `event_id` deduplication** — only the mapped event set above reaches
  Kakao; everything else is dropped on purpose.
- `currency` defaults to `"KRW"` for `purchase` when not provided.
- Set `consentRequired: true` to drop events until `ad_storage` is granted via `setConsent`. The
  default is no gating (platform delegation).
