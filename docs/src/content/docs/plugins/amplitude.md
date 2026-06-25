---
title: Amplitude
description: Send Funnel's GA4 events to Amplitude via window.amplitude.
sidebar:
  order: 13
---

The Amplitude plugin connects Funnel to **Amplitude** product analytics. It forwards Funnel's
GA4-standard events to Amplitude through `window.amplitude`, converting each event name to
Title Case (`add_to_cart` → `Add To Cart`).

## What it tracks

Every Funnel event is forwarded with a Title-Cased name:

| Funnel event (GA4) | Amplitude event |
| --- | --- |
| `page_view` | `Page View` |
| `view_item` | `View Item` |
| `add_to_cart` | `Add To Cart` |
| `purchase` | `Purchase` |
| …every other event | Title Case of the GA4 name |

Event parameters pass through, with an `items` array flattened into Amplitude-friendly
properties. For `purchase` and `refund`, the GA4 `value` is mapped to Amplitude's `revenue`.
Each event sets `insert_id` from Funnel's `eventId` for server-side deduplication.

## Before you start

- An **Amplitude API key**.
- The Amplitude Browser SDK loaded in your page, so `window.amplitude` exists before Funnel
  runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createAmplitudePlugin } from "@sunwjy/funnel-client/amplitude";

export const funnel = new Funnel({
  plugins: [createAmplitudePlugin()],
  debug: true,
});

funnel.initialize({
  amplitude: {
    apiKey: "your_api_key",
    // forwarded to amplitude.init(apiKey, options) — optional
    options: { serverZone: "EU" },
  },
});
```

`consentRequired: true` is optional — when set, events are dropped until `analytics_storage`
is granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 99,
  transaction_id: "T-4004",
});
```

This calls `amplitude.track("Purchase", { currency: "USD", revenue: 99, transaction_id: "T-4004", insert_id: "..." })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Use Amplitude's **User Look-Up** or **Live** stream to see events arrive in real time.

## Notes

- **SSR safe.** When `window` (or `window.amplitude`) is absent, the plugin does nothing.
- `funnel.setUser(...)` calls `amplitude.setUserId(user_id)` and sets remaining properties via
  an `amplitude.Identify()` instance (a plain object is ignored by the real SDK).
- `funnel.resetUser()` calls `amplitude.setUserId(null)` (logout).
- Only `purchase` and `refund` remap `value` → `revenue`; all other events keep `value` as-is.
- Use `options.serverZone: "EU"` for EU data residency.
