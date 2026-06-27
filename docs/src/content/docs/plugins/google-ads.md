---
title: Google Ads
description: Turn Funnel's GA4 events into Google Ads conversions via window.gtag.
sidebar:
  order: 6
---

The Google Ads plugin transforms Funnel's GA4-based events into **Google Ads conversion** events
through `window.gtag`. You map each GA4 event to a conversion label, and only those mapped events
are forwarded as conversions.

## What it tracks

For each GA4 event that has a configured **conversion label**, the plugin fires
`gtag("event", "conversion", { ...params, event_id, send_to: "<conversionId>/<label>" })`,
forwarding the original GA4 params (items, `transaction_id`, etc.) so Enhanced Conversions can
read them. Events **without** a mapped label are deliberately **not** forwarded. A bare
`gtag("event", ...)` would route to every gtag destination and double-count alongside the GA4
plugin.

## Before you start

- A **Google Ads conversion ID** (looks like `AW-XXXXXXXXX`).
- A **conversion label** for each action you want to track, from your Google Ads conversion
  setup.
- The gtag.js base snippet loaded so `window.gtag` exists.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGoogleAdsPlugin } from "@sunwjy/funnel-client/google-ads";

export const funnel = new Funnel({
  plugins: [createGoogleAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "google-ads": {
    conversionId: "AW-XXXXXXXXX",
    conversionLabels: {
      purchase: "AbC-D_efG-h12_34-567",
      sign_up: "XyZ-W_vuT-s98_76-543",
    },
  },
});
```

## Track an event

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
});
```

Because `purchase` has a label, this fires a Google Ads conversion. An event without a label
(e.g. `view_item`) is skipped by this plugin.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Use the **Google Tag Assistant** to confirm the conversion fires with the right `send_to`.
- Check **Conversions** reporting in the Google Ads UI (allow for attribution delay).

## Notes

- **SSR-safe**: every method returns early when `window` or `window.gtag` is missing.
- Conversions require **both** `conversionId` and a matching label; otherwise the event is
  silently skipped (by design, to avoid double-counting).
- `setUser` forwards `email` / `phone_number` / name as `gtag("set", "user_data", ...)` for
  Enhanced Conversions; gtag.js auto-hashes these when Enhanced Conversions is enabled on the
  tag. `resetUser` clears `user_data` to null.
- `setConsent` maps 1:1 to Google Consent Mode v2.
