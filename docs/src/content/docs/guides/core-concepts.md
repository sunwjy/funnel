---
title: Core concepts
description: The four ideas behind Funnel — the dispatcher, plugins, EventContext, and the GA4 schema.
sidebar:
  order: 1
---

Funnel has a small surface area. Once you understand four ideas — the **Funnel** dispatcher,
**plugins**, the **EventContext** (with its `eventId`), and **GA4 as the canonical schema** —
everything else follows.

## The Funnel dispatcher

`Funnel` is the object you create once and call everywhere. You give it a list of plugins, and
from then on a single `track()` call fans out to all of them.

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: true, // optional: log each dispatch to the console
});
```

It has a tiny public API:

- `new Funnel({ plugins, debug?, onError? })` — register plugins.
- `funnel.initialize({ <pluginName>: {<config>} })` — boot the plugins with their IDs.
- `funnel.track(eventName, params)` — send one event to every plugin.

There are also optional identity and consent helpers (`setUser`, `resetUser`, `setConsent`),
covered in their own guides.

:::tip[Events before initialize]
You can call `track()` before `initialize()`. Events are queued (up to 100) and replayed in
order once initialization completes — each keeps its original `eventId`. This means you never
lose the first page view to a race with your config loading.
:::

## Plugins

A **plugin** is one analytics platform's adapter. Each plugin knows how to translate a GA4
event into its platform's native call (`gtag`, `fbq`, `ttq`, and so on) and send it.

Conceptually, a plugin is just an object with a `name` and a few methods:

```ts
interface FunnelPlugin {
  name: string; // e.g. "ga4", "meta-pixel" — also the config key
  initialize(config: Record<string, unknown>): void;
  track(eventName, params, context): void;
  // optional:
  setUser?(properties): void;
  resetUser?(): void;
  setConsent?(state): void;
}
```

You rarely write a plugin by hand — you import a `createXPlugin()` factory and add it to the
`plugins` array. The `name` string is important: it's the key you use to pass config in
`initialize()`.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

## EventContext and eventId

Every time you call `track()`, Funnel generates a small **EventContext** and passes it to each
plugin alongside your parameters:

```ts
interface EventContext {
  eventId: string; // a unique UUID per track() call
}
```

The `eventId` is the same value for every plugin in a single `track()` call. That is what makes
**server-side deduplication** possible: the browser Meta Pixel and the server-side Conversions
API can report the same purchase, and Meta knows they're one event because they share an
`eventId`. See [Server-side & deduplication](/guides/server-side-dedup/) for the full picture.

You don't create or manage `eventId` yourself — Funnel does it for you, including for events
queued before `initialize()`.

## Dispatch fan-out and error isolation

One `track()` call reaches **all** plugins. Crucially, plugins are **error-isolated**: if one
plugin throws, the dispatcher catches it and keeps going, so the others still receive the event.

```ts
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });
//   → GA4        receives it
//   → Meta Pixel throws? → logged, but does not block
//   → TikTok     still receives it
```

By default a thrown error is logged with `console.error`. You can route errors to your own
monitoring instead by passing `onError` to the constructor:

```ts
const funnel = new Funnel({
  plugins: [/* ... */],
  onError: (error, { plugin, phase, eventName }) => {
    myErrorReporter.capture(error, { plugin, phase, eventName });
  },
});
```

Even with a custom `onError`, isolation still holds — one plugin failing never blocks the others.

## GA4 as the canonical schema

Funnel does not invent its own event vocabulary. **GA4 is the canonical schema**: you always
write event names and parameters in the GA4 convention, and each plugin maps *from* GA4 *to* its
own platform — never the reverse.

```ts
// You write the GA4 standard, once:
funnel.track("add_to_cart", { currency: "KRW", value: 89000, items: [/* ... */] });

// Plugins translate it:
//   → GA4        gtag("event", "add_to_cart", …)
//   → Meta Pixel fbq("track", "AddToCart", …)
//   → TikTok     ttq.track("AddToCart", …)
```

This is why there is one set of names to learn, and why the same event reaches every platform
in the shape that platform expects.

## Where to go next

- [Tracking your first events](/guides/first-events/) — the event names and parameters in detail.
- [Adding multiple plugins](/guides/multiple-plugins/) — connect several platforms at once.
- [Server-side & deduplication](/guides/server-side-dedup/) — put `eventId` to work.
