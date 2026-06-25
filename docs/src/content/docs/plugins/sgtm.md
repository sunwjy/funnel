---
title: Server-side GTM
description: POST Funnel's GA4 events to a server-side GTM container via Measurement Protocol.
sidebar:
  order: 3
---

The sGTM plugin sends Funnel events directly to a **server-side Google Tag Manager** container
using the GA4 **Measurement Protocol v2** JSON endpoint. Unlike the `gtm` plugin (which pushes
to `window.dataLayer` and relies on a browser snippet), this plugin bypasses the browser
container entirely and `POST`s each event to a URL you control.

## What it tracks

Every Funnel event is sent as a single Measurement Protocol event with the same name and
parameters, plus `event_id` (for deduplication against browser events), a derived `session_id`,
and `engagement_time_msec`. User identity from `setUser` is attached as `user_id` /
`user_properties`. There is no event-name mapping — names pass through unchanged.

## Before you start

This is a **server-relay** plugin: there is **no browser pixel global** like `gtag` or `fbq`.
Instead it needs:

- The **endpoint** URL of your sGTM container (e.g. `https://sgtm.example.com`).
- A **GA4 Measurement ID** (`G-XXXXXXXXXX`).
- A `client_id` — generated and persisted in `localStorage` (`_funnel_sgtm_cid`) automatically,
  or supplied via `clientId`.

The GA4 Measurement Protocol **API secret** should *not* be placed in browser code: it would
leak in DevTools, proxy logs, and CDN access logs. The recommended setup is to leave `apiSecret`
unset and have your sGTM container skip api_secret validation for browser traffic. If you must
send it, you have to also set `allowApiSecretInBrowser: true` to acknowledge the risk — otherwise
the plugin strips it and logs an error.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createSGTMPlugin } from "@sunwjy/funnel-client/sgtm";

export const funnel = new Funnel({
  plugins: [createSGTMPlugin()],
  debug: true,
});

funnel.initialize({
  sgtm: {
    endpoint: "https://sgtm.example.com",
    measurementId: "G-XXXXXXXXXX",
    // path defaults to "/mp/collect"
    // engagementTimeMsec defaults to 1
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

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Watch the **Network tab** for `POST` requests to your `endpoint` + path (default `/mp/collect`).
- Open **GA4 DebugView** (or your sGTM container's preview) to confirm events arrive.

## Notes

- **SSR-safe**: `track` is a no-op when `window` is absent, or when `endpoint` / `measurementId`
  are missing.
- A `client_id` is persisted in `localStorage` and a `session_id` in `sessionStorage` with a
  30-minute idle timeout (GA4's default).
- Set `consentRequired: true` to drop events until `analytics_storage` is granted via
  `setConsent`. The default is no gating (platform delegation).
- `nonPersonalizedAds` and a custom `engagementTimeMsec` can be set in config; the default
  `engagementTimeMsec` is `1` to avoid polluting GA4 engagement metrics.
