---
title: Naver Ad
description: Turn Funnel's GA4 events into Naver conversion tracking via window.wcs.
sidebar:
  order: 9
---

The Naver Ad plugin transforms Funnel's GA4-based events into **Naver** conversion-tracking
calls through `window.wcs`, using Naver's current `wcs.trans` conversion-script API (the legacy
`wcs.cnv`-string API is deprecated and not supported).

## What it tracks

`page_view` fires Naver's page-view beacon via `wcs_do()`. Mapped GA4 events build a `_conv`
object and pass it to `wcs.trans(_conv)`. For example, `purchase` → `purchase`, `sign_up` →
`sign_up`, `add_to_cart` → `add_to_cart`, `generate_lead` → `lead`, `add_to_wishlist` →
`add_to_wishlist`, `begin_checkout` → `begin_checkout`, `view_item` → `view_content`. GA4 `items`
become Naver conversion items (id, name, quantity, `payAmount`, category, option). Naver has a
fixed conversion taxonomy, so unmapped events are silently ignored.

## Before you start

- A **Naver common key** (네이버공통키), registered as `wcs_add["wa"]` (passed here as
  `accountId`).
- The Naver common script `//wcs.naver.net/wcslog.js` installed so `window.wcs` exists. Make sure
  it is a version that supports `wcs.trans` (older scripts degrade to a no-op for conversions).
- Optionally your **site domain** for `wcs.inflow()` cookie-domain setup.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createNaverAdPlugin } from "@sunwjy/funnel-client/naver-ad";

export const funnel = new Funnel({
  plugins: [createNaverAdPlugin()],
  debug: true,
});

funnel.initialize({
  "naver-ad": {
    accountId: "abcdef0123456789",
    siteDomain: "https://example.com", // optional
  },
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

This calls `wcs.trans({ type: "purchase", id: "T-1", value: "29000", items: [...] })`.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Watch the DevTools Network tab for requests to `wcs.naver.net`.
- Check conversion reporting in **Naver Search Ad / Naver Performance** dashboards.

## Notes

- **SSR-safe**: `track` no-ops when `window` or `window.wcs` is missing.
- The conversion `value` is sent as a **string** (Naver's guide expects this); for `purchase`
  with no top-level `value`, it falls back to the summed per-line `payAmount`.
- `transaction_id` is used as the conversion `id` for `purchase`.
- Only the mapped conversion taxonomy is supported; other GA4 events are dropped. The legacy
  `wcs.cnv` API is intentionally not used.
- Set `consentRequired: true` to drop events until `ad_storage` is granted via `setConsent`. The
  default is no gating (platform delegation).
