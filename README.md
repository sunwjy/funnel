# Funnel

A library that sends key marketing funnel events to all connected analytics tools through a single interface.

Events and parameters are defined based on GA4 standards. Each plugin transforms them into the target tool's native format.

## Packages

| Package | Description |
|---------|-------------|
| `@funnel/core` | Event types, plugin interface, Funnel class |
| `@funnel/plugin-ga4` | Google Analytics 4 (`gtag`) plugin |
| `@funnel/plugin-gtm` | Google Tag Manager (`dataLayer`) plugin |
| `@funnel/plugin-meta-pixel` | Meta Pixel (`fbq`) plugin |

## Usage

```ts
import { Funnel } from "@funnel/core";
import { createGA4Plugin } from "@funnel/plugin-ga4";
import { createMetaPixelPlugin } from "@funnel/plugin-meta-pixel";

const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});

// Type-safe event tracking — only matching params are allowed per event name
funnel.track("purchase", {
  currency: "USD",
  value: 29.99,
  transaction_id: "T-001",
  items: [
    { item_id: "SKU-1", item_name: "Premium Plan", price: 29.99, quantity: 1 },
  ],
});
```

A single `track` call sends the event to both GA4 and Meta Pixel.

## Supported Events

Only GA4 standard events relevant to the marketing funnel are included.

| Funnel Stage | Events |
|--------------|--------|
| Awareness | `page_view`, `view_promotion`, `select_promotion` |
| Acquisition | `sign_up`, `generate_lead` |
| Consideration | `search`, `view_item_list`, `select_item`, `view_item` |
| Intent | `add_to_cart`, `remove_from_cart` |
| Conversion | `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` |
| Post-purchase | `refund` |

## Plugin Event Mapping

The GA4 plugin passes events through directly via `gtag("event", ...)`.

The GTM plugin pushes events to `dataLayer` with the GA4 event name as the `event` key. GTM containers then route each event to the appropriate tags based on configured triggers.

The Meta Pixel plugin maps events to standard Meta events:

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
| Others | `trackCustom` (original event name preserved) |

The `items` array is automatically transformed into Meta Pixel's `content_ids`, `contents`, and `num_items`.

## Custom Plugins

Implement the `FunnelPlugin` interface to connect any analytics tool.

```ts
import type { EventMap, EventName, FunnelPlugin } from "@funnel/core";

export function createMyPlugin(): FunnelPlugin {
  return {
    name: "my-plugin",

    initialize(config) {
      // Setup logic
    },

    track<E extends EventName>(eventName: E, params: EventMap[E]) {
      // Transform GA4 events to the target tool's format and send
    },
  };
}
```

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build all packages
pnpm typecheck   # Run type checks
pnpm lint        # Run linter
pnpm lint:fix    # Auto-fix lint issues
```

## Tech Stack

- **Monorepo**: pnpm + Turborepo
- **Bundler**: tsdown (ESM + CJS dual build with `.d.ts` generation)
- **Lint/Format**: Biome
- **TypeScript**: strict mode, `verbatimModuleSyntax`
