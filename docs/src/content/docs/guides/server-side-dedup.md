---
title: Server-side & deduplication
description: Use the per-event eventId to pair the browser Meta Pixel with the Conversions API and avoid double-counting.
sidebar:
  order: 5
---

Sending the *same* conversion from both the browser and your server makes tracking far more
reliable: ad blockers and cookie restrictions cost you browser events, while server events miss
some browser-only signals. The catch is double-counting: the platform sees two purchases when
there was one. **Deduplication** solves this, and Funnel makes it automatic with the per-event
`eventId`.

## The `eventId` is the dedup key

On every `track()` call, Funnel generates a unique `eventId` (a UUID) and passes it to **all**
plugins in the same call via the [EventContext](/guides/core-concepts/). Because every plugin in
that call sees the *same* `eventId`, a browser event and a server event reporting the same action
carry the same identifier, and the platform treats them as one.

```ts
funnel.track("purchase", { transaction_id: "T-1", currency: "KRW", value: 29000 });
// Funnel generates one eventId, say "a1b2c3…", and hands it to every plugin:
//   → meta-pixel           fbq("track", "Purchase", …, { eventID: "a1b2c3…" })
//   → meta-conversion-api  POST { event_id: "a1b2c3…", … } to your server
// Meta sees both, matches on event_id, counts ONE purchase.
```

You don't manage `eventId`. Funnel does, including for events queued before `initialize()`.

## Pairing Meta Pixel with the Conversions API

The canonical setup is the browser **Meta Pixel** (`meta-pixel`) plus the **Meta Conversions
API** (`meta-conversion-api`) client plugin. Add both to the same Funnel:

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { createMetaConversionApiPlugin } from "@sunwjy/funnel-client/meta-conversion-api";

export const funnel = new Funnel({
  plugins: [
    createMetaPixelPlugin(),
    createMetaConversionApiPlugin(),
  ],
});

funnel.initialize({
  "meta-pixel": { pixelId: "1234567890" },
  "meta-conversion-api": {
    // Your own server endpoint that forwards to Meta CAPI.
    endpoint: "https://your-app.com/api/meta-capi",
    // Optional: shows events in the Events Manager "Test Events" tab.
    testEventCode: "TEST12345",
  },
});
```

Now a single `track("purchase", …)` does two things with the same `eventId`:

- The **Pixel** sends the browser event with `fbq("track", "Purchase", …, { eventID })`.
- The **CAPI plugin** POSTs a payload to *your* `endpoint`, including `event_id`, the event name,
  `event_source_url`, and `custom_data` (currency, value, order id, items).

Your server endpoint then forwards that payload to Meta's Conversions API. Meta matches the two
on `event_id` and deduplicates.

:::caution[The CAPI plugin needs your server]
`meta-conversion-api` is a *client* plugin: it collects and posts the event to **your** endpoint.
It does not call Meta directly (your CAPI access token must never live in the browser). You
provide the server route that receives the payload and forwards it to Meta with your token. If
no `endpoint` is configured, the plugin is a no-op.
:::

### What about PII?

The CAPI plugin hashes PII fields (email, phone, name, user id) with SHA-256 **in the browser**
before sending, so your endpoint only ever receives hashed values. Provide them via
`funnel.setUser({ email, phone_number, first_name, last_name, user_id })`. If the browser can't
hash (no SubtleCrypto), those fields are omitted rather than sent in the clear.

## Server-side GTM (GA4 Measurement Protocol)

The same `eventId` mechanism powers a Google-side hybrid setup via the **sGTM** plugin
(`sgtm`). It sends GA4-format events straight to a server-side GTM container using the
Measurement Protocol v2, propagating the `eventId` as the GA4 `event_id` parameter so
server-side tagging can deduplicate against your browser GA4/GTM events.

```ts
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createSGTMPlugin } from "@sunwjy/funnel-client/sgtm";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createSGTMPlugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  sgtm: {
    endpoint: "https://sgtm.example.com", // your server-side GTM container URL
    measurementId: "G-XXXXXXXXXX",
  },
});
```

:::caution[Keep the API secret out of the browser]
The GA4 Measurement Protocol `apiSecret` is sensitive. The `sgtm` plugin refuses to send it from
the browser unless you explicitly set `allowApiSecretInBrowser: true`, because doing so exposes
it in DevTools, proxy logs, and CDN access logs. The recommended approach is to leave `apiSecret`
unset and have your sGTM container skip api_secret validation for browser traffic.
:::

## Where to go next

- [Core concepts](/guides/core-concepts/): more on `EventContext` and `eventId`.
- [SSR considerations](/guides/ssr/): why these plugins are safe to construct during SSR.
- [Plugins catalog](/plugins/): full config for `meta-conversion-api` and `sgtm`.
