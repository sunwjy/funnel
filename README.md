# Funnel

A library that sends key marketing funnel events to all connected analytics tools through a single interface.

Events and parameters are defined based on GA4 standards. Each plugin transforms them into the target tool's native format.

## Packages

| Package | Description |
|---------|-------------|
| `@sunwjy/funnel-core` | Event types, plugin interface, Funnel class, `EventContext` (auto-generated `eventId`) |
| `@sunwjy/funnel-client` | All client-side plugins (GA4, GTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok, Kakao, Naver, X, LinkedIn, Mixpanel, Amplitude, Toss Ads, Reddit, Daangn, Pinterest) |

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
| `@sunwjy/funnel-client/toss-ads` | Toss Ads Pixel (`TossPixel`) |
| `@sunwjy/funnel-client/reddit-pixel` | Reddit Pixel (`rdt`) |
| `@sunwjy/funnel-client/daangn-ads` | Daangn Business conversion tracking (`karrotPixel`) |
| `@sunwjy/funnel-client/pinterest-tag` | Pinterest Tag (`pintrk`) |

## Usage

```ts
// Barrel import (tree-shakeable)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// Or subpath imports (guaranteed tree-shaking in all bundlers)
// import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
// import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

const funnel = new Funnel({
  plugins: [
    // Typed config at the factory — checked at compile time
    createGA4Plugin({ measurementId: "G-XXXXXXXXXX" }),
    createMetaPixelPlugin({ pixelId: "1234567890" }),
  ],
});

funnel.initialize();

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

Config can also be supplied (or overridden key-by-key) at runtime via `initialize()` — useful when IDs come from a remote config:

```ts
funnel.initialize({
  ga4: { measurementId: "G-RUNTIME" }, // overrides the factory value
  "meta-pixel": { pixelId: "1234567890" },
});
```

### Events before `initialize()`

`track()` calls made before `initialize()` are not lost: up to 100 events are queued and replayed in order once initialization completes (after `setUser`/`setConsent` replay). Each queued event keeps the `eventId` generated at call time, so cross-platform deduplication stays intact.

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
| GA4 | `gtag("set", { user_id })` + `gtag("set", "user_properties", {...})` | `gtag("set", { user_id: null })` + clears set user properties |
| GTM | `dataLayer.push({ event: "funnel.set_user", user_id, user_properties })` | `dataLayer.push({ event: "funnel.reset_user", ... })` |
| Meta Pixel | `fbq("init", pixelId, { em, fn, ln, ph, external_id })` | — (Meta has no documented clear API; data persists until page unload) |
| Meta CAPI | SHA-256-hashes `em`/`ph`/`fn`/`ln`/`external_id` once, merges into `user_data` on every `track` | Clears stored data |
| TikTok Pixel | `ttq.identify({ email, phone_number, external_id })` | — (TikTok has no un-identify API) |
| Mixpanel | `mixpanel.identify(user_id)` + `mixpanel.people.set({ $email, ... })` | `mixpanel.reset()` |
| Amplitude | `amplitude.setUserId(user_id)` + `new amplitude.Identify().set(...)` | `amplitude.setUserId(null)` |
| Google Ads | `gtag("set", "user_data", { email, phone_number, address })` | `gtag("set", "user_data", null)` |
| X Pixel | Stores normalized `email_address` / E.164 `phone_number`, attached to every event (pixel auto-hashes) | Clears stored data |
| Pinterest Tag | `pintrk("set", { em, ph, external_id, fn, ln })` (tag hashes raw values) | — |
| Kakao Pixel | — (no API) | — |
| Naver Ad | — (no API) | — |
| LinkedIn | — (no API) | — |
| Toss Ads | — (no public API) | — |
| Reddit Pixel | — (no API) | — |
| Daangn Ads | — (no API) | — |

## Consent Mode (`setConsent`)

Consent follows the [Google Consent Mode v2](https://developers.google.com/tag-platform/security/concepts/consent-mode) signal model. Partial updates are merged into the last known state and forwarded to every plugin; calls before `initialize()` are stored and applied first during initialization.

```ts
// e.g., wired to your CMP / cookie banner
funnel.setConsent({
  ad_storage: "denied",
  analytics_storage: "granted",
  ad_user_data: "denied",
  ad_personalization: "denied",
});
```

### Per-platform behavior

| Plugin | Behavior |
|--------|----------|
| GA4 / Google Ads / GTM | `gtag("consent", "update", state)` — Google's modeling (cookieless pings) keeps working on denied. GTM is a no-op without the gtag stub. |
| Meta Pixel | `fbq("consent", "grant" \| "revoke")` down-mapped from `ad_storage` |
| All others | No native consent API. By default events keep flowing (platform delegation). Set `consentRequired: true` in the plugin config to drop events until the relevant signal is granted — ad platforms (Meta CAPI, TikTok, Kakao, Naver, X, LinkedIn, Toss Ads, Reddit, Daangn, Pinterest) key off `ad_storage`; analytics tools (sGTM, Mixpanel, Amplitude) key off `analytics_storage`. |

```ts
// Opt-in gating example: hold TikTok events until ad_storage is granted
createTikTokPixelPlugin({ pixelId: "XXXX", consentRequired: true });
```

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

The GTM plugin pushes events to `dataLayer` with the GA4 event name as the `event` key. GTM containers then route each event to the appropriate tags based on configured triggers. For ecommerce events, GA4-spec keys (`items`, `currency`, `value`, `coupon`, `transaction_id`, `shipping`, `tax`, …) are nested under the conventional `ecommerce` object (cleared with `ecommerce: null` before each push), while custom params stay at the top level of the push where GTM variables read them.

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

PII from `setUser` (`email`, `phone_number`, `first_name`, `last_name`, `user_id`) is normalized and SHA-256-hashed **in the browser** — hashed once per `setUser` and reused across events — so the server endpoint never receives raw PII. When no `_fbc` cookie exists, `fbc` is synthesized from the `fbclid` query param once and kept stable across events.

Config: `{ endpoint: "https://your-server.com/api/meta-capi", testEventCode?: "TEST123", consentRequired?: true }`

### Google Ads

Sends conversion events via `gtag("event", "conversion", { send_to })`. Requires `conversionId` and `conversionLabels` mapping in config. Only events with a configured conversion label are sent — unlabeled events are dropped, because a bare `gtag("event")` call without `send_to` would be routed to **all** configured gtag destinations and double-count in GA4 when the GA4 plugin is also registered.

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
| Others | Custom event (original name) |

`select_item` is intentionally NOT mapped to `ClickButton` — TikTok's `ClickButton` is for non-product CTAs, and conflating product-list clicks with it inflates that counter in Ads Manager.

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

Uses Naver's **new conversion script API** (`wcs.trans` version) — the legacy `wcs.cnv` string API is deprecated by Naver and not supported. Conversions are sent as `wcs.trans({ type, id, value, items })`; `page_view` fires the PV beacon via `wcs_do()`.

Config: `{ accountId: "공통키 (wcs_add[\"wa\"])", siteDomain?: "example.com" }`

| GA4 Event | Naver Conversion Type |
|-----------|-----------------------|
| `page_view` | PV beacon (`wcs_do()`) |
| `purchase` | `purchase` (with `id` = `transaction_id`, `value`, `items`) |
| `sign_up` | `sign_up` |
| `add_to_cart` | `add_to_cart` |
| `generate_lead` | `lead` |
| `add_to_wishlist` | `add_to_wishlist` |
| `begin_checkout` | `begin_checkout` |
| `view_item` | `view_content` |
| Others | Ignored (fixed taxonomy) |

GA4 `items` map to Naver's item schema (`id`, `name`, `quantity`, `payAmount` = unit price × quantity, `category` ← `item_category`, `option` ← `item_variant`). When `purchase` has no top-level `value`, the summed per-line `payAmount` is used.

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

Advanced matching: after `setUser`, normalized `email_address` and E.164 `phone_number` are attached to every event as X's documented event parameters — the uwt.js pixel SHA-256-hashes them client-side before transmission.

### LinkedIn Insight Tag

Sends conversion events via `lintrk("track", { conversion_id })`. Each GA4 event must be mapped to a LinkedIn conversion ID via the `conversionIds` config. Page views are tracked automatically by the Insight Tag.

### Mixpanel

All events are sent via `mixpanel.track()` with Title Case event names (e.g., `page_view` → `"Page View"`). The `items` array is flattened into `item_ids`, `item_names`, and `num_items`. All other properties pass through as-is.

### Amplitude

All events are sent via `amplitude.track()` with Title Case event names. For `purchase` and `refund` events, `value` is mapped to `revenue` for Amplitude's revenue tracking. The `items` array is flattened the same way as Mixpanel.

### Toss Ads Pixel (토스애즈)

| GA4 Event | Toss Pixel Method |
|-----------|-------------------|
| `page_view` | `pageView()` |
| `view_item` | `productView({ product_id, product_name, ... })` |
| `add_to_cart` | `addToCart({ products, revenue, currency })` |
| `add_to_wishlist` | `addToWishlist({ products, ... })` |
| `begin_checkout` | `initiateCheckout({ order_id, revenue, products, ... })` |
| `purchase` | `purchase({ order_id, revenue, total_quantity, currency, products })` |
| `search` | `search()` (`search_term` → `custom_param2`) |
| `sign_up` | `signUp()` |
| `login` | `signIn()` |
| `generate_lead` | `lead()` |
| Others | Ignored (no custom event support) |

Toss Pixel has no native deduplication ID, so the `eventId` is forwarded via `custom_param1` for server-side reconciliation. Default currency is `KRW`.

### Reddit Pixel

| GA4 Event | Reddit Pixel Event |
|-----------|-------------------|
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `add_to_wishlist` | `AddToWishlist` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `SignUp` |
| `search` | `Search` |
| Others | `Custom` (original name preserved via `customEventName`) |

Every event includes `conversionId: eventId` for deduplication against Reddit's Conversions API.

### Daangn (당근비즈니스) 전환 추적

| GA4 Event | Daangn Event |
|-----------|--------------|
| `page_view` | `ViewPage` |
| `view_item` | `ViewContent({ id })` |
| `add_to_cart` | `AddToCart({ products })` |
| `sign_up` | `CompleteRegistration` |
| `purchase` | `Purchase({ total_price, total_quantity, products })` |
| Others | Ignored (no custom event support) |

### Pinterest Tag

| GA4 Event | Pinterest Event |
|-----------|-----------------|
| `page_view` | `pagevisit` |
| `view_item_list` / `select_promotion` | `viewcategory` |
| `search` / `view_search_results` | `search` (`search_query`) |
| `add_to_cart` | `addtocart` |
| `purchase` | `checkout` (`order_id`, `order_quantity`, `line_items`) |
| `sign_up` | `signup` |
| `generate_lead` | `lead` |
| Others | `custom` (original name preserved via `event_name`) |

`begin_checkout` is intentionally NOT mapped to `checkout` — Pinterest's `checkout` represents a *completed* purchase, so it falls through to `custom`. Every event includes `event_id: eventId` for Conversions API deduplication.

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

    // Optional — receive Consent Mode v2 signals
    setConsent(state) {
      // Map state.ad_storage / state.analytics_storage / ... to the
      // target tool's consent API, or gate dispatch internally
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
