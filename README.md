# Funnel

A library that sends key marketing funnel events to all connected analytics tools through a single interface.

Events and parameters are defined based on GA4 standards. Each plugin transforms them into the target tool's native format.

## Packages

| Package | Description |
|---------|-------------|
| `@sunwjy/funnel-core` | Event types, plugin interface, Funnel class, `EventContext` (auto-generated `eventId`) |
| `@sunwjy/funnel-client` | All client-side plugins (GA4, GTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok, Kakao, Naver, X, LinkedIn, Mixpanel, Amplitude) |

### Client Plugins

| Subpath | Description |
|---------|-------------|
| `@sunwjy/funnel-client/ga4` | Google Analytics 4 (`gtag`) |
| `@sunwjy/funnel-client/gtm` | Google Tag Manager (`dataLayer`) |
| `@sunwjy/funnel-client/meta-pixel` | Meta Pixel (`fbq`) |
| `@sunwjy/funnel-client/google-ads` | Google Ads conversion tracking (`gtag`) |
| `@sunwjy/funnel-client/tiktok-pixel` | TikTok Pixel (`ttq`) |
| `@sunwjy/funnel-client/kakao-pixel` | Kakao Pixel (`kakaoPixel`) |
| `@sunwjy/funnel-client/naver-ad` | Naver Ad WCSLOG (`wcs`) |
| `@sunwjy/funnel-client/x-pixel` | X/Twitter Pixel (`twq`) |
| `@sunwjy/funnel-client/linkedin-insight` | LinkedIn Insight Tag (`lintrk`) |
| `@sunwjy/funnel-client/mixpanel` | Mixpanel (`mixpanel`) |
| `@sunwjy/funnel-client/meta-conversion-api` | Meta Conversion API (server-side relay via `sendBeacon`/`fetch`) |
| `@sunwjy/funnel-client/amplitude` | Amplitude (`amplitude`) |

## Usage

```ts
// Barrel import (tree-shakeable)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// Or subpath imports (guaranteed tree-shaking in all bundlers)
// import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
// import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

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

## User Identification (`setUser` / `resetUser`)

Set user identity once — it propagates to all plugins that support it. The format follows GA4's user properties model.

```ts
// After login
funnel.setUser({
  user_id: "U-12345",
  email: "user@example.com",
  phone_number: "+821012345678",
  first_name: "Jaeyun",
  last_name: "Woo",
  plan: "premium", // custom properties are also supported
});

// After logout
funnel.resetUser();
```

`setUser` can be called before `initialize()` — the properties are stored and automatically replayed to each plugin during initialization.

### UserProperties

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | `string?` | Stable cross-device identifier (GA4 `user_id`) |
| `email` | `string?` | Email for advanced matching (Meta, TikTok, X, Google Ads) |
| `phone_number` | `string?` | Phone in E.164 format (e.g., `"+821012345678"`) |
| `first_name` | `string?` | First name (Meta Advanced Matching, Google Enhanced Conversions) |
| `last_name` | `string?` | Last name (Meta Advanced Matching, Google Enhanced Conversions) |
| `[key]` | `unknown` | Arbitrary custom user properties |

### Per-Plugin Mapping

| Plugin | `setUser` | `resetUser` |
|--------|-----------|-------------|
| GA4 | `gtag("set", { user_id })` + `gtag("set", "user_properties", {...})` | `gtag("set", { user_id: null })` |
| GTM | `dataLayer.push({ event: "set_user_properties", user_properties })` | `dataLayer.push({ event: "reset_user_properties" })` |
| Meta Pixel | `fbq("init", pixelId, { em, fn, ln, ph, external_id })` | — |
| Meta CAPI | Merges `em`, `ph`, `fn`, `ln`, `external_id` into `user_data` on every `track` | Clears stored data |
| TikTok Pixel | `ttq.identify({ email, phone_number, external_id })` | — |
| Mixpanel | `mixpanel.identify(user_id)` + `mixpanel.people.set({ $email, ... })` | `mixpanel.reset()` |
| Amplitude | `amplitude.setUserId(user_id)` + `amplitude.identify({...})` | `amplitude.setUserId(null)` |
| Google Ads | `gtag("set", "user_data", { email, phone_number, address })` | — |
| X Pixel | `twq("config", pixelId, { em, ph_number })` | — |
| Kakao Pixel | — (no API) | — |
| Naver Ad | — (no API) | — |
| LinkedIn | — (no API) | — |

## Event Deduplication (`eventId`)

Every `funnel.track()` call automatically generates a unique `eventId` (UUID) and passes it to all plugins via `EventContext`. This enables deduplication between client-side pixels and server-side APIs (e.g., Meta Pixel + Conversion API).

- The Meta Pixel plugin passes `eventId` as the `eventID` parameter to `fbq()` calls
- The Meta Conversion API plugin includes `event_id` in the server payload
- The server matches events using the shared `eventId` to avoid double-counting

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

The `items` array is automatically transformed into Meta Pixel's `content_ids`, `contents`, and `num_items`. The `eventId` is passed as `eventID` for Conversion API deduplication.

### Meta Conversion API

Collects client-side event data + user data (`_fbp`, `_fbc` cookies, `userAgent`, page URL) and POSTs to a configured server endpoint via `sendBeacon`/`fetch`. The server then forwards to Meta's Conversion API. Each payload includes `event_id` from `EventContext` for deduplication with the Meta Pixel.

Config: `{ endpoint: "https://your-server.com/api/meta-capi" }`

### Google Ads

Sends conversion events via `gtag("event", "conversion", { send_to })`. Requires `conversionId` and `conversionLabels` mapping in config. Events with a configured conversion label are sent as conversions; others pass through as standard gtag events.

### TikTok Pixel

| GA4 Event | TikTok Pixel Event |
|-----------|-------------------|
| `page_view` | `ttq.page()` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `add_payment_info` | `AddPaymentInfo` |
| `purchase` | `CompletePayment` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `SubmitForm` |
| `select_item` | `ClickButton` |
| Others | Custom event (original name) |

### Kakao Pixel

| GA4 Event | Kakao Pixel Method |
|-----------|-------------------|
| `page_view` | `pageView()` |
| `search` | `search({ keyword })` |
| `view_item` | `viewContent({ id })` |
| `add_to_cart` | `addToCart({ id })` |
| `begin_checkout` | `viewCart()` |
| `purchase` | `purchase({ total_quantity, total_price, currency, products })` |
| `sign_up` | `completeRegistration()` |
| `generate_lead` | `participation()` |
| Others | Ignored (no custom event support) |

### Naver Ad (WCSLOG)

| GA4 Event | Naver Conversion Type |
|-----------|-----------------------|
| `page_view` | Page view (`wcs_do()` without conversion) |
| `purchase` | Type 1 (Purchase) |
| `sign_up` | Type 2 (Registration) |
| `add_to_cart` | Type 3 (Cart) |
| `generate_lead` | Type 4 (Lead) |
| `begin_checkout` / `add_payment_info` | Type 5 (Other) |
| Others | Ignored |

### X (Twitter) Pixel

| GA4 Event | X Pixel Event |
|-----------|--------------|
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `Lead` |
| `add_payment_info` | `AddPaymentInfo` |
| Others | Custom event (original name) |

### LinkedIn Insight Tag

Sends conversion events via `lintrk("track", { conversion_id })`. Each GA4 event must be mapped to a LinkedIn conversion ID via the `conversionIds` config. Page views are tracked automatically by the Insight Tag.

### Mixpanel

All events are sent via `mixpanel.track()` with Title Case event names (e.g., `page_view` → `"Page View"`). The `items` array is flattened into `item_ids`, `item_names`, and `num_items`. All other properties pass through as-is.

### Amplitude

All events are sent via `amplitude.track()` with Title Case event names. For `purchase` and `refund` events, `value` is mapped to `revenue` for Amplitude's revenue tracking. The `items` array is flattened the same way as Mixpanel.

## Custom Plugins

Implement the `FunnelPlugin` interface to connect any analytics tool.

```ts
import type { EventContext, EventMap, EventName, FunnelPlugin, UserProperties } from "@sunwjy/funnel-client";

export function createMyPlugin(): FunnelPlugin {
  return {
    name: "my-plugin",

    initialize(config) {
      // Setup logic
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) {
      // context.eventId — unique ID for deduplication
      // Transform GA4 events to the target tool's format and send
    },

    // Optional — implement if the target tool supports user identification
    setUser(properties: UserProperties) {
      // Map GA4 user properties to the target tool's format
    },

    // Optional — implement for logout support
    resetUser() {
      // Clear user identity in the target tool
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

## Pre-release Backlog

- [ ] Contributing guide — `CONTRIBUTING.md` with development setup and PR guidelines
- [ ] Examples — Standalone usage examples (vanilla HTML, React/Next.js integration)
- [ ] API docs — Auto-generated API reference via TypeDoc or API Extractor

## Tech Stack

- **Monorepo**: pnpm + Turborepo
- **Bundler**: tsdown (ESM + CJS dual build with `.d.ts` generation)
- **Lint/Format**: Biome
- **TypeScript**: strict mode, `verbatimModuleSyntax`
