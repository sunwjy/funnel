---
title: EventContext
description: The per-event context carrying the shared eventId used for deduplication.
sidebar:
  order: 4
---

`EventContext` is a small metadata object that the [`Funnel`](/reference/funnel/) dispatcher
generates on **every** [`track()`](/reference/funnel/#trackeventname-params) call and passes to
each plugin's [`track()`](/reference/funnel-plugin/#trackeventname-params-context). It holds data
that is _not_ part of the GA4 event schema but is needed for cross-platform features — chiefly
server-side deduplication.

```ts
import type { EventContext } from "@sunwjy/funnel-core";
```

## Shape

| Field | Type | Description |
| --- | --- | --- |
| `eventId` | `string` | Unique identifier for this event, used for deduplication (e.g., Meta CAPI). |

## One eventId per `track()`, shared by every plugin

For a single `track()` call, the dispatcher generates **one** `eventId` and hands the same
`context` object to every registered plugin. So GA4, the Meta Pixel, and any other plugin all see
the identical `eventId` for that one event.

This is the key to deduplication: if the **same** event is reported through two channels — for
example the Meta Pixel in the browser **and** the Meta Conversions API (CAPI) from your
server — both reports can carry the same `eventId`, and Meta will count it once instead of twice.

```ts
// Inside a plugin, the eventId is available on context:
track(eventName, params, context) {
  fbq("track", "Purchase", { value: params.value }, { eventID: context.eventId });
}
```

## How `eventId` is generated

The dispatcher uses `crypto.randomUUID()` when it's available (modern browsers and Node), and
falls back to a UUID-v4-shaped string built with `Math.random()` in environments that lack it.
Either way you get a unique UUID-shaped string.

The `eventId` is generated at **call time**. So if you `track()` before `initialize()`, the event
is queued and later replayed with its **original** `eventId` intact — the identity is fixed when
you call `track`, not when it is dispatched. See
[queuing before `initialize`](/reference/funnel/#queuing-before-initialize).

## Powering server-side deduplication

The typical flow when you run a pixel in the browser and its server-side counterpart:

1. The browser calls `funnel.track("purchase", { ... })`. The dispatcher creates one `eventId`.
2. The browser-side plugin (e.g., Meta Pixel) sends the event with that `eventId`.
3. You forward the same logical event to the platform's server API (e.g., Meta CAPI) **with the
   same `eventId`**.
4. The platform sees two reports of one event sharing an ID and deduplicates them.

To make step 3 possible, expose the `eventId` to your server (e.g., include it in the request
body when the browser also calls your backend). The shared identifier is what links the two
reports.

## See also

- [`Funnel`](/reference/funnel/) — generates the `EventContext` on each `track()`.
- [`FunnelPlugin`](/reference/funnel-plugin/) — receives `context` as the third `track`
  argument.
- [`EventMap`](/reference/event-map/) — note that `purchase.transaction_id` is the GA4-level ID
  many platforms also use for purchase deduplication.
