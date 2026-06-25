---
title: Pinterest Tag
description: Send Funnel's GA4 events to the Pinterest Tag via window.pintrk.
sidebar:
  order: 17
---

The Pinterest Tag plugin connects Funnel to **Pinterest Ads**. It maps Funnel's GA4-standard
events into the Pinterest Tag's standard events and dispatches them through `window.pintrk`.
Unmapped events are sent as `custom` events with the original GA4 name preserved.

## What it tracks

| Funnel event (GA4) | Pinterest event |
| --- | --- |
| `page_view` | `pagevisit` |
| `view_item_list` | `viewcategory` |
| `select_promotion` | `viewcategory` |
| `search` | `search` |
| `view_search_results` | `search` |
| `add_to_cart` | `addtocart` |
| `purchase` | `checkout` |
| `sign_up` | `signup` |
| `generate_lead` | `lead` |

Any other event (including `begin_checkout`) is sent as
`pintrk("track", "custom", { ..., event_name: "<ga4 name>" })`. Every event includes
`event_id` (Funnel's `eventId`) for deduplication with the Conversions API.

## Before you start

- A **Pinterest Tag ID** (advertiser ad account tag).
- The Pinterest base tag loaded in your page, so `window.pintrk` exists before Funnel runs.

## Install & initialize

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createPinterestTagPlugin } from "@sunwjy/funnel-client/pinterest-tag";

export const funnel = new Funnel({
  plugins: [createPinterestTagPlugin()],
  debug: true,
});

funnel.initialize({
  "pinterest-tag": { tagId: "2612345678901" },
});
```

`consentRequired: true` is optional — when set, events are dropped until `ad_storage` is
granted through `funnel.setConsent(...)`.

## Track an event

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 60,
  transaction_id: "T-8008",
  items: [{ item_id: "SKU-3", item_name: "Hat", price: 60, quantity: 1 }],
});
```

This calls `pintrk("track", "checkout", { currency: "USD", value: 60, order_id: "T-8008", order_quantity: 1, line_items: [...], event_id: "..." })`.

## Verify

- Set `debug: true` on the Funnel to log each dispatch in the console.
- Install the **Pinterest Tag Helper** browser extension to inspect events as they fire.
- Confirm `window.pintrk` exists in DevTools and watch the Network tab for requests to
  `ct.pinterest.com`.

## Notes

- **SSR safe.** When `window` (or `window.pintrk`) is absent, the plugin does nothing.
- `begin_checkout` is intentionally **not** mapped to Pinterest `checkout` — Pinterest's
  `checkout` means a *completed* purchase, so it falls through to a `custom` event instead to
  avoid inflating conversions.
- `funnel.setUser(...)` calls `pintrk("set", ...)` for enhanced match, mapping `email`→`em`,
  `phone_number`→`ph`, `user_id`→`external_id`, `first_name`→`fn`, `last_name`→`ln`.
- Item arrays become `line_items` with `product_id`/`product_name`/`product_price`/
  `product_quantity`/`product_category`.
