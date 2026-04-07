# @funnel/plugin-ga4

Google Analytics 4 plugin for [Funnel](../../README.md).

Sends events to GA4 via `window.gtag`. Since GA4 is the canonical event format, events are passed through without transformation.

## Installation

```bash
npm install @funnel/core @funnel/plugin-ga4
```

## Usage

```ts
import { Funnel } from "@funnel/core";
import { createGA4Plugin } from "@funnel/plugin-ga4";

const funnel = new Funnel({
  plugins: [createGA4Plugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
});

funnel.track("page_view", { page_title: "Home" });
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `measurementId` | `string` | GA4 Measurement ID (e.g., `"G-XXXXXXXXXX"`) |

## Behavior

- Calls `gtag("config", measurementId)` on initialization
- Calls `gtag("event", eventName, params)` on each `track()` call
- Silently skips in SSR environments where `window` is not available

## License

[MIT](../../LICENSE)
