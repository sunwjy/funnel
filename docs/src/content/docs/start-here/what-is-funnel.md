---
title: What is Funnel?
description: Understand the problem Funnel solves and the one idea behind it.
sidebar:
  order: 1
---

If you run marketing campaigns, you probably send the same events — page views, sign-ups,
purchases — to several analytics tools: Google Analytics, the Meta Pixel, TikTok, and so on.
Each one has its own SDK, its own event names, and its own parameter shapes. Wiring them up
separately is repetitive and easy to get out of sync.

**Funnel solves this with one idea: write each event once, in the GA4 standard, and let
plugins translate it for every platform.**

```ts
// You write this, once:
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });

// Funnel dispatches it to every connected plugin, each mapping it to its own format:
//   → GA4        gtag("event", "purchase", …)
//   → Meta Pixel fbq("track", "Purchase", …)
//   → TikTok     ttq.track("CompletePayment", …)
```

## The mental model

- **GA4 is the canonical schema.** Every event name and parameter follows the GA4
  convention. Plugins map *from* GA4 to their platform — never the other way around.
- **One `track()` call fans out to all plugins.** You connect plugins once; every event
  reaches all of them.
- **Plugins are error-isolated.** If one plugin throws, the others still receive the event.
- **Every event gets a unique `eventId`.** This enables server-side deduplication (for
  example, matching a browser Meta Pixel event with a server-side Conversions API event).

## What Funnel is not

- It is **not** an analytics product — it sends data *to* analytics tools, it does not
  store or visualize it.
- It does **not** bundle the platform SDKs. You still load `gtag`, `fbq`, etc. as usual;
  Funnel calls those globals for you.

## Next steps

1. [Install Funnel](/start-here/installation/)
2. [Send your first events in 5 minutes](/start-here/quickstart/)
3. Read the [core concepts](/guides/) when you want to go deeper.
