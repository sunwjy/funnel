---
title: Google Tag Manager
description: Push Funnel's GA4-format events to the GTM dataLayer for container-side routing.
sidebar:
  order: 2
---

The GTM plugin pushes Funnel events to the **Google Tag Manager** `window.dataLayer`. Your GTM
container then routes each event to the right tags based on its own triggers, so you wire
destinations in GTM, not in code.

## What it tracks

Each Funnel event becomes a `dataLayer.push` with `event` set to the GA4 event name and an
`event_id`. Ecommerce events (`view_item`, `add_to_cart`, `purchase`, `refund`,
`view_promotion`, and so on) wrap their `items`/`currency`/`value`/`coupon` fields under an
`ecommerce` object per GTM's GA4 ecommerce convention; custom params stay at the top level.
Before each ecommerce push the plugin clears the previous `ecommerce` object
(`dataLayer.push({ ecommerce: null })`) so stale items don't leak between events.

## Before you start

- A **GTM Container ID** (looks like `GTM-XXXXXXX`).
- The standard GTM container snippet installed on your page, so `window.dataLayer` exists.
- Configure your tags and triggers inside the GTM dashboard to consume the pushed events.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGTMPlugin } from "@sunwjy/funnel-client/gtm";

export const funnel = new Funnel({
  plugins: [createGTMPlugin()],
  debug: true,
});

funnel.initialize({
  gtm: { containerId: "GTM-XXXXXXX" },
});
```

## Track an event

```ts
funnel.track("add_to_cart", {
  currency: "KRW",
  value: 12000,
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 12000, quantity: 1 }],
});
```

This pushes `{ event: "add_to_cart", event_id: "...", ecommerce: { items, currency, value } }`.

## Verify

- Enable `debug: true` on the `Funnel` to log each dispatch.
- Open the **GTM Preview / Tag Assistant** to watch events arrive and tags fire.
- Inspect `window.dataLayer` directly in the browser DevTools console.

## Notes

- **SSR-safe**: every method returns early when `window` is absent.
- `containerId` is used only to push the one-time `gtm.start` / `gtm.js` bootstrap entry; it is
  not validated. Most setups load the official GTM snippet separately.
- `setConsent` only forwards to Consent Mode when a `gtag` stub exists on the page (the
  `function gtag(){dataLayer.push(arguments)}` pattern GTM uses for consent). Without it,
  consent updates are a no-op.
