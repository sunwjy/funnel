---
title: Google Analytics 4
description: Send Funnel's GA4-standard events straight to Google Analytics 4 via window.gtag.
sidebar:
  order: 1
---

The GA4 plugin sends Funnel events to **Google Analytics 4** through `window.gtag`. Because
Funnel's events already follow the GA4 schema, this plugin passes them through unchanged. No
transformation needed.

## What it tracks

Every Funnel event is forwarded as a GA4 `event` with the same name and parameters, plus an
`event_id` (from the [`EventContext`](/start-here/quickstart/)) for cross-platform
deduplication. `setUser` maps to `gtag("set", ...)` and consent maps 1:1 to Consent Mode v2.

## Before you start

- A **GA4 Measurement ID** (looks like `G-XXXXXXXXXX`) from your GA4 property.
- The standard GA4 base snippet (gtag.js) loaded in your page `<head>`, so that
  `window.gtag` exists before Funnel runs. Funnel only calls `gtag`; it does not load it for
  you.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";

export const funnel = new Funnel({
  plugins: [createGA4Plugin()],
  debug: true,
});

funnel.initialize({
  ga4: {
    measurementId: "G-XXXXXXXXXX",
    // Optional: forwarded to gtag("config", id, config)
    config: { send_page_view: false },
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

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch to the console.
- Set `config: { debug_mode: true }` and open GA4 **DebugView** in the Google Analytics UI.
- Inspect outgoing `gtag` calls in the browser DevTools Network tab (requests to
  `google-analytics.com`).

## Notes

- **SSR-safe**: when `window` (or `window.gtag`) is unavailable, `track`, `setUser`, and
  `setConsent` quietly skip. Nothing throws.
- The `config` field is forwarded verbatim to `gtag("config", measurementId, config)`, so you
  can control GA4 SDK behavior (`send_page_view`, `cookie_domain`, `anonymize_ip`, etc.).
- `setConsent` mirrors Google Consent Mode v2 signals one-to-one
  (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`).
