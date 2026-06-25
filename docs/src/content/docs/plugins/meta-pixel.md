---
title: Meta Pixel
description: Map Funnel's GA4 events to Meta Pixel standard events via window.fbq.
sidebar:
  order: 4
---

The Meta Pixel plugin transforms Funnel's GA4-based events into **Meta Pixel** (Facebook Pixel)
standard events and sends them through `window.fbq`.

## What it tracks

Mapped GA4 events become Meta standard events. For example, `purchase` → `Purchase`,
`add_to_cart` → `AddToCart`, `begin_checkout` → `InitiateCheckout`, `view_item` →
`ViewContent`, `sign_up` → `CompleteRegistration`, `generate_lead` → `Lead`, and `search` →
`Search`. GA4 `items` are reshaped into `content_ids` / `contents` / `num_items`. Any event
**not** in the mapping is sent as a custom event via `fbq("trackCustom", <eventName>, ...)`.
Every call carries `{ eventID: context.eventId }` for browser↔server deduplication with the
Conversions API.

## Before you start

- A **Meta Pixel ID** from Meta Events Manager.
- The standard Meta Pixel base code loaded in your page `<head>`, so `window.fbq` exists before
  Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createMetaPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "meta-pixel": { pixelId: "1234567890" },
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

This fires `fbq("track", "Purchase", { currency, value, content_ids, contents, num_items,
order_id }, { eventID })`.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Install the **Meta Pixel Helper** browser extension to watch events fire.
- Use the **Test Events** tab in Meta Events Manager.
- Inspect `fbq` requests to `facebook.com/tr` in the DevTools Network tab.

## Notes

- **SSR-safe**: every method returns early when `window` or `window.fbq` is missing.
- `setUser` re-runs `fbq("init", pixelId, { em, ph, fn, ln, external_id })` for Advanced
  Matching. Meta Pixel has **no documented way to clear** that data, so this plugin implements no
  `resetUser`. The data persists until the page unloads. Reload after logout if you need a clean
  slate.
- `setConsent` uses Meta's binary consent API, derived from `ad_storage`
  (`granted` → `grant`, otherwise `revoke`).
- Pair this with the [Meta Conversions API](/plugins/meta-conversion-api/) plugin to dedupe
  server events using the shared `eventId`.
