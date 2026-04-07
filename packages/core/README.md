# @funnel/core

Core package for the [Funnel](../../README.md) marketing event tracking library.

Provides the `Funnel` dispatcher class, the `FunnelPlugin` interface, and GA4-based event type definitions.

## Installation

```bash
npm install @funnel/core
```

## Usage

```ts
import { Funnel } from "@funnel/core";
import { createGA4Plugin } from "@funnel/plugin-ga4";

const funnel = new Funnel({
  plugins: [createGA4Plugin()],
  debug: true,
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
});

funnel.track("purchase", {
  currency: "USD",
  value: 29.99,
  transaction_id: "T-001",
  items: [{ item_id: "SKU-1", item_name: "Premium Plan", price: 29.99, quantity: 1 }],
});
```

## API

### `new Funnel(config)`

| Option | Type | Description |
|--------|------|-------------|
| `plugins` | `FunnelPlugin[]` | List of plugins to register |
| `debug` | `boolean` | Enable debug logging (default: `false`) |

### `funnel.initialize(pluginConfigs?)`

Initializes all registered plugins. Each plugin receives `pluginConfigs[plugin.name]` as its configuration.

### `funnel.track(eventName, params)`

Sends a type-safe event to all plugins. Errors from individual plugins are isolated — one failure does not block others.

### `FunnelPlugin` interface

```ts
interface FunnelPlugin {
  name: string;
  initialize(config: Record<string, unknown>): void;
  track<E extends EventName>(eventName: E, params: EventMap[E]): void;
}
```

## Supported Events

| Funnel Stage | Events |
|--------------|--------|
| Awareness | `page_view`, `view_promotion`, `select_promotion` |
| Acquisition | `sign_up`, `generate_lead` |
| Consideration | `search`, `view_item_list`, `select_item`, `view_item` |
| Intent | `add_to_cart`, `remove_from_cart` |
| Conversion | `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` |
| Post-purchase | `refund` |

## License

[MIT](../../LICENSE)
