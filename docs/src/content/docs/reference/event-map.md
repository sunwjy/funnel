---
title: EventMap
description: The GA4-based catalog of event names Funnel supports and each event's parameters.
sidebar:
  order: 1
---

`EventMap` is the canonical event schema. It maps every supported event name to the shape of
its parameters. Because GA4 is the source of truth, every event name and parameter below comes
straight from the GA4 standard. Plugins map _from_ this schema into each platform's native
format, never the other way around.

When you call [`funnel.track(eventName, params)`](/reference/funnel/), TypeScript uses
`EventMap` to check that `params` matches the event you named.

```ts
import type { EventMap, EventName } from "@sunwjy/funnel-core";

// EventName is the union of every key in EventMap:
//   "page_view" | "view_promotion" | "sign_up" | ... | "refund"
type Name = EventName;
```

All parameter types extend `BaseEventParams`, which carries an index signature
(`[key: string]: unknown`). That means you can always add extra custom fields beyond the ones
documented here.

## The `Item` type

`Item` is the shared product/item shape used by every ecommerce event (`view_item`,
`add_to_cart`, `purchase`, and so on). It follows the GA4 item schema. Only `item_id` and
`item_name` are required.

```ts
import type { Item } from "@sunwjy/funnel-core";
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `item_id` | `string` | Yes | Unique identifier for the item (e.g., SKU). |
| `item_name` | `string` | Yes | Name of the item. |
| `affiliation` | `string` | No | Product affiliation or store name. |
| `coupon` | `string` | No | Coupon code applied to the item. |
| `discount` | `number` | No | Discount amount associated with the item. |
| `index` | `number` | No | Index/position of the item in a list (0-based). |
| `item_brand` | `string` | No | Brand of the item. |
| `item_category` | `string` | No | Primary category of the item. |
| `item_category2` | `string` | No | Secondary category of the item. |
| `item_category3` | `string` | No | Tertiary category of the item. |
| `item_category4` | `string` | No | Quaternary category of the item. |
| `item_category5` | `string` | No | Quinary category of the item. |
| `item_list_id` | `string` | No | ID of the list the item belongs to. |
| `item_list_name` | `string` | No | Name of the list the item belongs to. |
| `item_variant` | `string` | No | Variant of the item (e.g., color, size). |
| `location_id` | `string` | No | Physical location ID associated with the item. |
| `price` | `number` | No | Unit price of the item. |
| `quantity` | `number` | No | Quantity of the item. |
| `promotion_id` | `string` | No | Promotion ID associated with the item. |
| `promotion_name` | `string` | No | Promotion name associated with the item. |
| `creative_name` | `string` | No | Name of the promotional creative. |
| `creative_slot` | `string` | No | Slot of the promotional creative. |

## Page & engagement

### `page_view`

Sent when a page is viewed.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `page_title` | `string` | No | Title of the page. |
| `page_location` | `string` | No | Full URL of the page. |
| `page_referrer` | `string` | No | URL of the previous page (referrer). |

### `share`

Sent when a user shares content.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `method` | `string` | No | Sharing channel (e.g., `"twitter"`, `"email"`). |
| `content_type` | `string` | No | Type of shared content. |
| `item_id` | `string` | No | ID of the shared content. |

## Search

### `search`

Sent when a user performs a search.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `search_term` | `string` | Yes | The search query string. |

### `view_search_results`

Sent when a user views the results of a search.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `search_term` | `string` | Yes | The search query string. |
| `items` | `Item[]` | No | Items shown as search results. |

## Auth & leads

### `sign_up`

Sent when a user completes the sign-up process.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `method` | `string` | No | Sign-up method (e.g., `"google"`, `"email"`). |

### `login`

Sent when a user signs in to an existing account.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `method` | `string` | No | Login method (e.g., `"google"`, `"email"`). |

### `generate_lead`

Sent when a lead is generated.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code (e.g., `"USD"`, `"KRW"`). |
| `value` | `number` | No | Monetary value of the lead. |

## Promotions

### `view_promotion`

Sent when a promotion is displayed to the user.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `Item[]` | No | Items included in the promotion. |
| `promotion_id` | `string` | No | Promotion ID. |
| `promotion_name` | `string` | No | Promotion name. |
| `creative_name` | `string` | No | Name of the promotional creative. |
| `creative_slot` | `string` | No | Slot of the promotional creative. |
| `location_id` | `string` | No | Location ID associated with the promotion. |

### `select_promotion`

Sent when a user clicks or selects a promotion.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `Item[]` | No | Items included in the promotion. |
| `promotion_id` | `string` | No | Promotion ID. |
| `promotion_name` | `string` | No | Promotion name. |
| `creative_name` | `string` | No | Name of the promotional creative. |
| `creative_slot` | `string` | No | Slot of the promotional creative. |
| `location_id` | `string` | No | Location ID associated with the promotion. |

## Ecommerce: browsing

### `view_item_list`

Sent when a product list (e.g., a category page) is viewed.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `Item[]` | No | Items displayed in the list. |
| `item_list_id` | `string` | No | ID of the item list. |
| `item_list_name` | `string` | No | Name of the item list. |

### `select_item`

Sent when an item is selected from a list.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `Item[]` | No | The selected item(s). |
| `item_list_id` | `string` | No | ID of the list the item was selected from. |
| `item_list_name` | `string` | No | Name of the list the item was selected from. |

### `view_item`

Sent when a product detail page is viewed.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Monetary value of the item. |
| `items` | `Item[]` | No | The viewed item(s). |

## Ecommerce: cart and wishlist

### `add_to_wishlist`

Sent when an item is added to a wishlist.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total value of items added. |
| `items` | `Item[]` | No | Items added to the wishlist. |

### `add_to_cart`

Sent when an item is added to the cart.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total value of items added to the cart. |
| `items` | `Item[]` | No | Items added to the cart. |

### `remove_from_cart`

Sent when an item is removed from the cart.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total value of items removed from the cart. |
| `items` | `Item[]` | No | Items removed from the cart. |

### `view_cart`

Sent when a user views their shopping cart.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total value of items in the cart. |
| `items` | `Item[]` | No | Items in the cart. |

## Ecommerce: checkout and purchase

### `begin_checkout`

Sent when the checkout process is initiated.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total checkout value. |
| `coupon` | `string` | No | Applied coupon code. |
| `items` | `Item[]` | No | Items in the checkout. |

### `add_shipping_info`

Sent when shipping information is submitted.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total checkout value. |
| `coupon` | `string` | No | Applied coupon code. |
| `shipping_tier` | `string` | No | Shipping tier (e.g., `"express"`, `"standard"`). |
| `items` | `Item[]` | No | Items being shipped. |

### `add_payment_info`

Sent when payment information is submitted.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total checkout value. |
| `coupon` | `string` | No | Applied coupon code. |
| `payment_type` | `string` | No | Payment method (e.g., `"credit_card"`, `"paypal"`). |
| `items` | `Item[]` | No | Items being purchased. |

### `purchase`

Sent when a purchase is completed. `transaction_id` is **required** by GA4 and is what most
platforms use for server-side deduplication of purchase events.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `transaction_id` | `string` | Yes | Unique transaction identifier (required by GA4). |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Total purchase value (including shipping and tax). |
| `coupon` | `string` | No | Applied coupon code. |
| `shipping` | `number` | No | Shipping cost. |
| `tax` | `number` | No | Tax amount. |
| `items` | `Item[]` | No | Purchased items. |

### `refund`

Sent when a refund is processed.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | `string` | No | Currency code. |
| `value` | `number` | No | Refund amount. |
| `transaction_id` | `string` | No | Original transaction identifier. |
| `coupon` | `string` | No | Applied coupon code. |
| `shipping` | `number` | No | Refunded shipping cost. |
| `tax` | `number` | No | Refunded tax amount. |
| `items` | `Item[]` | No | Refunded items. |

## Example

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";

const funnel = new Funnel({ plugins: [createGA4Plugin()] });
funnel.initialize({ ga4: { measurementId: "G-XXXXXXXXXX" } });

// A purchase with one item: types are checked against PurchaseParams + Item.
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
  items: [{ item_id: "SKU-1", item_name: "Sneakers", price: 29000, quantity: 1 }],
});
```

## See also

- [`Funnel`](/reference/funnel/): the dispatcher that consumes this schema in `track()`.
- [`FunnelPlugin`](/reference/funnel-plugin/): how a plugin receives each event.
