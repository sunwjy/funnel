---
title: LinkedIn Insight Tag
description: Send Funnel's GA4 events to LinkedIn as conversions via window.lintrk.
sidebar:
  order: 11
---

The LinkedIn Insight Tag plugin connects Funnel to **LinkedIn Ads**. It maps Funnel's
GA4-standard events to LinkedIn conversions and fires them through `window.lintrk`. LinkedIn
identifies conversions by numeric **conversion ID**, so each GA4 event you care about must be
mapped to its conversion ID in the plugin config.

## What it tracks

LinkedIn does not have named standard events — it uses conversion IDs. You supply a
`conversionIds` map from GA4 event names to your LinkedIn conversion IDs:

| Funnel event (GA4) | LinkedIn |
| --- | --- |
| `page_view` | Tracked automatically by the Insight Tag (skipped by Funnel) |
| Any mapped event | `lintrk("track", { conversion_id })` |
| Any unmapped event | Dropped (optionally logged when `debug: true`) |

When an event has both `value` and `currency`, Funnel sends a revenue object:
`{ value: { currency, amount } }`.

## Before you start

- A **LinkedIn Partner ID** from Campaign Manager.
- One or more **conversion IDs** created under Campaign Manager → Conversions.
- The LinkedIn Insight Tag base snippet loaded in your page, so `window.lintrk` exists before
  Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createLinkedInInsightPlugin } from "@sunwjy/funnel-client/linkedin-insight";

export const funnel = new Funnel({
  plugins: [createLinkedInInsightPlugin()],
  debug: true,
});

funnel.initialize({
  "linkedin-insight": {
    partnerId: "1234567",
    conversionIds: {
      sign_up: 9876543,
      purchase: 9876544,
    },
    debug: false, // warn on unmapped non-page_view events
  },
});
```

`consentRequired: true` is optional — when set, events are dropped until `ad_storage` is
granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 120,
  transaction_id: "T-2002",
});
```

With the mapping above this calls `lintrk("track", { conversion_id: 9876544, value: { currency: "USD", amount: 120 } })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Use the **LinkedIn Insight Tag** browser extension to confirm the tag is firing.
- Check conversion counts in LinkedIn Campaign Manager (allow time for processing).

## Notes

- **SSR safe.** When `window` (or `window.lintrk`) is absent, the plugin does nothing.
- `page_view` is intentionally never sent — the Insight Tag records page views on its own.
- Events without a matching entry in `conversionIds` are dropped. Set the plugin's `debug: true`
  to get a `console.warn` for each dropped event while wiring things up.
