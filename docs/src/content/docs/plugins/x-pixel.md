---
title: X Pixel
description: Send Funnel's GA4 events to the X (Twitter) Pixel via window.twq.
sidebar:
  order: 10
---

The X Pixel plugin connects Funnel to **X (Twitter) Ads**. It maps Funnel's GA4-standard
events into the X Pixel's native event format and dispatches them through `window.twq`.
Unmapped events are sent as custom events under their original GA4 name.

## What it tracks

| Funnel event (GA4) | X Pixel event |
| --- | --- |
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `Lead` |
| `add_payment_info` | `AddPaymentInfo` |

Any other event is forwarded as a custom event via `twq("event", "<ga4 name>", ...)`. Every
event carries `event_id` (Funnel's `eventId`) so it can be deduplicated against server-side
conversions.

## Before you start

- An **X Pixel ID** from your X Ads account.
- The X base pixel snippet (uwt.js) loaded in your page `<head>`, so that `window.twq` exists
  before Funnel runs. Funnel only sends events — it does not load the pixel for you.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createXPixelPlugin } from "@sunwjy/funnel-client/x-pixel";

export const funnel = new Funnel({
  plugins: [createXPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "x-pixel": { pixelId: "abc12" },
});
```

`consentRequired: true` is optional — when set, events are dropped until you grant
`ad_storage` through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 49,
  transaction_id: "T-1001",
});
```

This calls `twq("event", "Purchase", { currency: "USD", value: 49, order_id: "T-1001", event_id: "..." })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the browser console.
- Install the **X Pixel Helper** browser extension to inspect events as they fire.
- In DevTools, confirm `window.twq` exists and watch the Network tab for requests to
  `analytics.twitter.com`.

## Notes

- **SSR safe.** When `window` (or `window.twq`) is absent, the plugin does nothing — no errors
  on the server.
- **Advanced matching.** Calling `funnel.setUser({ email, phone_number })` attaches normalized
  `email_address` / `phone_number` (E.164) as event parameters. The pixel SHA-256-hashes them
  client-side, so Funnel sends normalized plaintext (pre-hashing would break matching).
- Per-item `price`/`quantity` are sent as a `contents` array; otherwise items collapse to
  `content_ids` + `content_type: "product"`.
