---
title: Tracking your first events
description: How event names and parameters work, and a tour of the most common GA4 events.
sidebar:
  order: 2
---

Every event you send through Funnel has two parts: a **name** (a GA4 event name like
`page_view` or `purchase`) and a **params** object (the parameters that event accepts). You pass
both to `track()`:

```ts
funnel.track(eventName, params);
```

Because Funnel uses GA4 as its canonical schema, the names and parameters below are the GA4
standard ones. TypeScript autocompletes both: once you type the event name, your editor knows
exactly which parameters are valid.

:::tip[Type safety for free]
`track()` is fully typed. If you write `funnel.track("purchase", {})`, TypeScript flags the
missing required `transaction_id`. Lean on autocomplete instead of memorizing parameters.
:::

## A tour of common events

Here are the events you'll reach for most often, with their real parameters.

### page_view

Sent when a page (or route) is viewed. All parameters are optional.

```ts
funnel.track("page_view", {
  page_title: "Home",
  page_location: window.location.href,
  page_referrer: document.referrer,
});
```

### sign_up

Sent when a user completes registration. `method` describes how they signed up.

```ts
funnel.track("sign_up", { method: "google" });
```

### login

Sent when a user signs in to an existing account.

```ts
funnel.track("login", { method: "email" });
```

### search

Sent when a user performs a search. `search_term` is **required**.

```ts
funnel.track("search", { search_term: "running shoes" });
```

### view_item

Sent when a product detail page is viewed. Pass the product(s) as `items` using the GA4 item
shape.

```ts
funnel.track("view_item", {
  currency: "KRW",
  value: 89000,
  items: [
    {
      item_id: "SHOE-001",
      item_name: "Classic Running Shoe",
      item_brand: "FunnelSports",
      item_category: "Sports/Shoes",
      price: 89000,
      quantity: 1,
    },
  ],
});
```

### add_to_cart

Sent when an item is added to the cart. Same item shape as `view_item`.

```ts
funnel.track("add_to_cart", {
  currency: "KRW",
  value: 89000,
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

### begin_checkout

Sent when checkout starts. Accepts an optional `coupon` in addition to the cart fields.

```ts
funnel.track("begin_checkout", {
  currency: "KRW",
  value: 89000,
  coupon: "WELCOME10",
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

### purchase

Sent when a purchase completes. `transaction_id` is **required**: GA4 needs it, and most
platforms use it for server-side deduplication of purchases.

```ts
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 89000,
  shipping: 3000,
  tax: 0,
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

## The GA4 `Item` shape

Ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, and others) carry
an `items` array. Each item follows the GA4 `Item` schema. Only `item_id` and `item_name` are
required; the rest are optional:

```ts
{
  item_id: "SHOE-001",     // required (e.g. SKU)
  item_name: "Classic Running Shoe", // required
  item_brand: "FunnelSports",
  item_category: "Sports/Shoes",
  item_variant: "Red / 270",
  price: 89000,
  quantity: 1,
  coupon: "WELCOME10",
  discount: 5000,
}
```

## The full event list

Funnel ships the complete GA4 event vocabulary. Beyond the ones above, you also have:
`view_promotion`, `select_promotion`, `share`, `generate_lead`, `view_search_results`,
`view_item_list`, `select_item`, `add_to_wishlist`, `remove_from_cart`, `view_cart`,
`add_shipping_info`, `add_payment_info`, and `refund`.

Each has its own typed parameters; your editor will show you the exact shape as you type. For
the definitive list of every event and parameter, see the [Reference](/reference/).

## Where to go next

- [Adding multiple plugins](/guides/multiple-plugins/): fan one event out to several platforms.
- [Core concepts](/guides/core-concepts/): how the dispatcher and plugins fit together.
