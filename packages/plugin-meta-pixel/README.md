# @funnel/plugin-meta-pixel

Meta Pixel (Facebook Pixel) plugin for [Funnel](../../README.md).

Transforms GA4-based events into Meta Pixel standard events and sends them via `window.fbq`.

## Installation

```bash
npm install @funnel/core @funnel/plugin-meta-pixel
```

## Usage

```ts
import { Funnel } from "@funnel/core";
import { createMetaPixelPlugin } from "@funnel/plugin-meta-pixel";

const funnel = new Funnel({
  plugins: [createMetaPixelPlugin()],
});

funnel.initialize({
  "meta-pixel": { pixelId: "1234567890" },
});

funnel.track("purchase", {
  currency: "USD",
  value: 29.99,
  items: [{ item_id: "SKU-1", item_name: "Premium Plan", quantity: 1 }],
});
// → fbq("track", "Purchase", { currency: "USD", value: 29.99, content_ids: ["SKU-1"], ... })
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `pixelId` | `string` | Meta Pixel ID |

## Event Mapping

| GA4 Event | Meta Pixel Event |
|-----------|------------------|
| `page_view` | `PageView` |
| `view_item` / `view_item_list` / `select_item` | `ViewContent` |
| `search` | `Search` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `add_payment_info` | `AddPaymentInfo` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `CompleteRegistration` |
| Others | `trackCustom` (original name preserved) |

## Parameter Transformation

- `items` → `content_ids`, `contents`, `num_items`, `content_type`
- `search_term` → `search_string`
- `sign_up` adds `status: "complete"` and maps `method` → `content_name`
- `view_item_list` sets `content_type: "product_group"`
- `currency` and `value` are passed through directly

## License

[MIT](../../LICENSE)
