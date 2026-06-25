---
title: Quickstart (5 minutes)
description: Connect GA4 and the Meta Pixel and send your first event.
sidebar:
  order: 3
---

This walkthrough connects two plugins — **GA4** and the **Meta Pixel** — and sends a couple of
events. It assumes you've already [installed `@sunwjy/funnel-client`](/start-here/installation/).

## 1. Load the platform base snippets

Funnel calls `window.gtag` and `window.fbq`, so those globals must exist first. Add the
standard GA4 and Meta Pixel base snippets to your page `<head>` (the ones each platform gives
you in its dashboard). You only need them loaded — Funnel handles the event calls.

## 2. Create a Funnel with plugins

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: true, // logs each dispatch to the console while you're wiring things up
});
```

## 3. Initialize with your IDs

Pass each plugin's configuration keyed by the plugin name. Runtime config given here wins
over anything you passed to the factory.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

## 4. Track events

Call `track()` with a GA4 event name and its parameters. The same call reaches **every**
plugin.

```ts
// A page view
funnel.track("page_view", { page_title: "Home" });

// A purchase — GA4 standard parameters
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
});
```

That's it. With `debug: true` you'll see each event logged, and both GA4 and the Meta Pixel
will receive their platform-native versions.

:::tip[Events before initialize]
You can call `track()` before `initialize()` — events are queued (up to 100) and replayed in
order once initialization completes, each keeping its original `eventId`.
:::

## Where to go next

- [Core concepts](/guides/) — how `Funnel`, plugins, and `EventContext` fit together
- [Plugins catalog](/plugins/) — add TikTok, Kakao, LinkedIn, and more
- [Server-side & deduplication](/guides/) — pair the Meta Pixel with the Conversions API
