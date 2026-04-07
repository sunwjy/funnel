# @funnel/plugin-gtm

Google Tag Manager plugin for [Funnel](../../README.md).

Pushes GA4-format events to the GTM `dataLayer`. GTM containers then route each event to the appropriate tags based on configured triggers.

## Installation

```bash
npm install @funnel/core @funnel/plugin-gtm
```

## Usage

```ts
import { Funnel } from "@funnel/core";
import { createGTMPlugin } from "@funnel/plugin-gtm";

const funnel = new Funnel({
  plugins: [createGTMPlugin()],
});

funnel.initialize({
  gtm: { containerId: "GTM-XXXXXXX" },
});

funnel.track("purchase", { currency: "USD", value: 29.99 });
// → window.dataLayer.push({ event: "purchase", currency: "USD", value: 29.99 })
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `containerId` | `string` | GTM Container ID (e.g., `"GTM-XXXXXXX"`) |

## Behavior

- Initializes `window.dataLayer` if not already present
- Pushes a `gtm.js` bootstrap event when `containerId` is provided
- Each `track()` call pushes `{ event: eventName, ...params }` to `dataLayer`
- Silently skips in SSR environments where `window` is not available

## License

[MIT](../../LICENSE)
