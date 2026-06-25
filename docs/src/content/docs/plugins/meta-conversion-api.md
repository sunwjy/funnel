---
title: Meta Conversions API
description: Forward Funnel's GA4 events to your server for delivery to Meta's Conversions API.
sidebar:
  order: 5
---

The Meta Conversions API (CAPI) plugin collects GA4-based event data in the browser and forwards
it to **a server endpoint you control**, which then delivers it to **Meta's Conversions API**.
It shares the `eventId` with the browser-side [Meta Pixel](/plugins/meta-pixel/) so Meta can
deduplicate the server and browser copies of the same event.

## What it tracks

Mapped GA4 events become Meta event names (`purchase` → `Purchase`, `add_to_cart` → `AddToCart`,
`view_item` → `ViewContent`, etc.); unmapped events fall through with their original name. Each
payload includes `event_id`, `event_time`, `event_source_url`, `action_source: "website"`,
`custom_data` (currency / value / `content_ids` / `contents` / `order_id` …), and `user_data`.
PII fields (`em`, `ph`, `fn`, `ln`, `external_id`) are **SHA-256 hashed in the browser** before
sending. If SubtleCrypto is unavailable they are omitted rather than sent in the clear. The
plugin also collects `_fbp` / `_fbc` cookies (synthesizing `fbc` from an `fbclid` query param
when present) and the user agent.

## Before you start

This is a **server-relay** plugin: there is **no browser pixel global**. It needs a server
endpoint that accepts the JSON payload and forwards it to Meta CAPI with your access token.
The access token lives on **your server**, never in the browser. Provide:

- **endpoint**: your server URL that relays to Meta CAPI.
- Optionally **testEventCode** (e.g. `TEST12345`) to surface events in the Events Manager
  Test Events tab.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaConversionApiPlugin } from "@sunwjy/funnel-client/meta-conversion-api";

export const funnel = new Funnel({
  plugins: [createMetaConversionApiPlugin()],
  debug: true,
});

funnel.initialize({
  "meta-conversion-api": {
    endpoint: "https://api.example.com/meta-capi",
    testEventCode: "TEST12345", // optional
  },
});
```

## Track an event

```ts
// Hashed PII is attached automatically once setUser is called
funnel.setUser({ email: "user@example.com" });

funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 29000, quantity: 1 }],
});
```

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Watch the **Network tab** for the `POST` to your `endpoint`.
- Set `testEventCode` and open the **Test Events** tab in Meta Events Manager.
- Confirm the `event_id` matches the Meta Pixel's so Meta deduplicates the pair.

## Notes

- **SSR-safe**: `track` is a no-op when `window` is absent or `endpoint` is empty.
- Hashing is cached: `setUser` hashes the PII once and every later `track` reuses the digests.
  `resetUser` clears them.
- Set `consentRequired: true` to drop events until `ad_storage` is granted via `setConsent`. The
  default is no gating (platform delegation).
- Use the same `transaction_id` and rely on the shared `eventId` to deduplicate against the
  browser Meta Pixel.
