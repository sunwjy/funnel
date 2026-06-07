# @sunwjy/funnel-core

Core package for the [Funnel](../../README.md) marketing event tracking library.

Provides the `Funnel` dispatcher class, the `FunnelPlugin` interface, and GA4-based event type definitions.

## Installation

```bash
npm install @sunwjy/funnel-core
```

## Usage

```ts
import { Funnel } from "@sunwjy/funnel-core";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";

const funnel = new Funnel({
  plugins: [createGA4Plugin({ measurementId: "G-XXXXXXXXXX" })],
  debug: true,
});

funnel.initialize();

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
| `onError` | `(error, context) => void` | Replaces the default `console.error` for plugin failures (e.g., forward to Sentry). Errors stay isolated either way. |

### `funnel.initialize(pluginConfigs?)`

Initializes all registered plugins. Each plugin receives `pluginConfigs[plugin.name]` merged over its factory config (runtime wins key-by-key). Idempotent per plugin (safe for HMR). Afterwards, stored consent, stored user properties, and queued events are replayed — in that order.

### `funnel.track(eventName, params)`

Sends a type-safe event to all plugins with an `EventContext` containing a unique `eventId` (UUID) for cross-platform deduplication. Errors from individual plugins are isolated — one failure does not block others.

Events tracked **before** `initialize()` are queued (up to 100, then dropped with a warning) and replayed in order after initialization; the `eventId` is fixed at call time.

### `funnel.setUser(properties)` / `funnel.resetUser()`

Propagates user identity (GA4 user-properties model) to every plugin that implements `setUser`/`resetUser`. Calls before `initialize()` are stored and replayed.

### `funnel.setConsent(state)`

Updates consent using the Google Consent Mode v2 signals (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`). Partial updates are merged; the full accumulated state is forwarded to plugins implementing `setConsent`. Calls before `initialize()` are stored and applied first during initialization.

### `FunnelPlugin` interface

```ts
interface FunnelPlugin {
  name: string;
  initialize(config: Record<string, unknown>): void;
  track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void;
  setUser?(properties: UserProperties): void;
  resetUser?(): void;
  setConsent?(state: ConsentState): void;
}
```

### PII helpers

`normalizePii(value, kind)` / `hashPii(value, kind)` centralize the normalization + SHA-256 hashing that ad platforms expect for advanced matching. Kinds: `"email"`, `"phone"` (digits only — Meta/Google), `"phone_e164"` (leading `+` preserved — X), `"name"`, `"id"`. `hashPii` returns `undefined` when SubtleCrypto is unavailable so callers omit the field instead of sending raw PII.

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
