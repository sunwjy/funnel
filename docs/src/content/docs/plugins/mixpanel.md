---
title: Mixpanel
description: Send Funnel's GA4 events to Mixpanel via window.mixpanel.
sidebar:
  order: 12
---

The Mixpanel plugin connects Funnel to **Mixpanel** product analytics. It forwards Funnel's
GA4-standard events to Mixpanel through `window.mixpanel`, converting each event name to Title
Case (`add_to_cart` → `Add To Cart`).

## What it tracks

Every Funnel event is forwarded with a Title-Cased name:

| Funnel event (GA4) | Mixpanel event |
| --- | --- |
| `page_view` | `Page View` |
| `view_item` | `View Item` |
| `add_to_cart` | `Add To Cart` |
| `purchase` | `Purchase` |
| …every other event | Title Case of the GA4 name |

Event parameters pass through as-is; an `items` array is flattened into Mixpanel-friendly
properties. Each event sets `$insert_id` from Funnel's `eventId` so duplicate sends are
deduplicated server-side.

## Before you start

- A **Mixpanel project token**.
- The Mixpanel base snippet loaded in your page, so `window.mixpanel` exists before Funnel
  runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMixpanelPlugin } from "@sunwjy/funnel-client/mixpanel";

export const funnel = new Funnel({
  plugins: [createMixpanelPlugin()],
  debug: true,
});

funnel.initialize({
  mixpanel: {
    token: "your_project_token",
    // forwarded to mixpanel.init(token, config) — optional
    config: { api_host: "https://api-eu.mixpanel.com" },
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
  transaction_id: "T-3003",
});
```

This calls `mixpanel.track("Purchase", { currency: "USD", value: 99, transaction_id: "T-3003", $insert_id: "..." })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Pass `config: { debug: true }` to Mixpanel to see its own console output.
- Watch **Events** in the Mixpanel dashboard, or use **Live View** for real-time events.

## Notes

- **SSR safe.** When `window` (or `window.mixpanel`) is absent, the plugin does nothing.
- `funnel.setUser(...)` calls `mixpanel.identify(user_id)` and `mixpanel.people.set(...)`,
  mapping `email`/`phone_number`/`first_name`/`last_name` to Mixpanel's `$email`/`$phone`/
  `$first_name`/`$last_name`. Other properties pass through unchanged.
- `funnel.resetUser()` calls `mixpanel.reset()` (logout).
- Use `config.api_host` for EU data residency (`https://api-eu.mixpanel.com`).
