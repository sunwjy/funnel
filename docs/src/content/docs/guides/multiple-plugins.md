---
title: Adding multiple plugins
description: Connect several analytics platforms at once and configure each by its plugin name.
sidebar:
  order: 3
---

The whole point of Funnel is to send one event to many platforms. Adding more platforms means
adding more plugins to the array. Your `track()` calls don't change at all.

## Connect several plugins

Import each factory from its subpath and list them in `plugins`:

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";
import { createKakaoPixelPlugin } from "@sunwjy/funnel-client/kakao-pixel";

export const funnel = new Funnel({
  plugins: [
    createGA4Plugin(),
    createMetaPixelPlugin(),
    createTikTokPixelPlugin(),
    createKakaoPixelPlugin(),
  ],
  debug: true,
});
```

## Configure each plugin by its name

`initialize()` takes a map keyed by each plugin's `name`. The factory you import determines the
key. For example, `createMetaPixelPlugin()` registers under `"meta-pixel"`.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
  "tiktok-pixel": { pixelId: "CXXXXXXXXXXXXXXXXXXX" },
  "kakao-pixel": { trackId: "1234567890123456789" },
});
```

The plugin `name` strings are stable identifiers:

`ga4`, `gtm`, `sgtm`, `meta-pixel`, `meta-conversion-api`, `google-ads`, `tiktok-pixel`,
`kakao-pixel`, `naver-ad`, `x-pixel`, `linkedin-insight`, `mixpanel`, `amplitude`, `toss-ads`,
`reddit-pixel`, `daangn-ads`, `pinterest-tag`.

:::note[Where config can go]
You can pass configuration either to the factory (`createGA4Plugin({ measurementId })`) or to
`initialize()`. When both are present, the values passed to `initialize()` win. Passing IDs at
`initialize()` time is handy when you read them from environment variables at runtime.
:::

## Track once, reach everyone

Now a single `track()` call dispatches to every connected plugin, each mapping the GA4 event to
its own format:

```ts
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
});
//   → GA4          gtag("event", "purchase", …)
//   → Meta Pixel   fbq("track", "Purchase", …)
//   → TikTok       ttq.track("CompletePayment", …)
//   → Kakao Pixel  …its own purchase call
```

## See it with debug:true

While wiring things up, set `debug: true` on the constructor. Funnel logs each plugin's dispatch
to the console, so you can confirm every platform received the event:

```text
[funnel] Plugin "ga4" initialized
[funnel] Plugin "meta-pixel" initialized
[funnel] "ga4" tracked "purchase" { transaction_id: "T-1", currency: "KRW", value: 29000 }
[funnel] "meta-pixel" tracked "purchase" { transaction_id: "T-1", currency: "KRW", value: 29000 }
```

Turn it off in production.

## Error isolation in practice

With several plugins connected, you want one misbehaving platform to never take down your
analytics. Funnel guarantees this: each plugin runs inside a try/catch, so if one throws, the
others still receive the event.

```ts
funnel.track("page_view", { page_title: "Home" });
//   → ga4         tracked
//   → meta-pixel  throws (e.g. fbq not loaded yet) → logged, isolated
//   → tiktok      tracked   (unaffected by meta-pixel failing)
```

By default the failure is logged with `console.error`. To forward failures to your own
monitoring, pass `onError` to the constructor:

```ts
const funnel = new Funnel({
  plugins: [/* ... */],
  onError: (error, { plugin, phase, eventName }) => {
    // phase is "initialize" | "track" | "setUser" | "resetUser" | "setConsent"
    myErrorReporter.capture(error, { plugin, phase, eventName });
  },
});
```

The isolation guarantee holds whether or not you provide `onError`.

## Where to go next

- [Framework integration](/guides/framework-integration/): wire this into React, Next.js, or plain HTML.
- [Server-side & deduplication](/guides/server-side-dedup/): pair the Meta Pixel with the Conversions API.
- [Plugins catalog](/plugins/): setup details for every platform.
