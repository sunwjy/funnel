# @sunwjy/funnel-client

Client-side analytics plugins for the [Funnel](https://github.com/sunwjy/funnel) marketing event tracking library.

One `track()` call dispatches a GA4-shaped event to every connected analytics tool. Each plugin transforms it into the target platform's native format.

## Installation

```bash
npm install @sunwjy/funnel-client
```

That's the only package you need. `@sunwjy/funnel-core` is installed automatically as a dependency, and all of its APIs — the `Funnel` class, every event type, `hashPii`, etc. — are re-exported from `@sunwjy/funnel-client`.

## Usage

```ts
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

const funnel = new Funnel({
  plugins: [
    createGA4Plugin({ measurementId: "G-XXXXXXXXXX" }),
    createMetaPixelPlugin({ pixelId: "1234567890" }),
  ],
});

funnel.initialize();

funnel.track("purchase", {
  currency: "USD",
  value: 29.99,
  transaction_id: "T-001",
  items: [
    { item_id: "SKU-1", item_name: "Premium Plan", price: 29.99, quantity: 1 },
  ],
});
```

## Subpath imports (guaranteed tree-shaking)

```ts
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
```

## Available plugins

| Subpath | Description |
|---------|-------------|
| `@sunwjy/funnel-client/ga4` | Google Analytics 4 (`gtag`) |
| `@sunwjy/funnel-client/gtm` | Google Tag Manager (`dataLayer`) |
| `@sunwjy/funnel-client/sgtm` | Server-side GTM relay |
| `@sunwjy/funnel-client/meta-pixel` | Meta Pixel (`fbq`) |
| `@sunwjy/funnel-client/meta-conversion-api` | Meta Conversion API (server relay) |
| `@sunwjy/funnel-client/google-ads` | Google Ads conversion tracking (`gtag`) |
| `@sunwjy/funnel-client/tiktok-pixel` | TikTok Pixel (`ttq`) |
| `@sunwjy/funnel-client/kakao-pixel` | Kakao Pixel (`kakaoPixel`) |
| `@sunwjy/funnel-client/naver-ad` | Naver Ad WCSLOG (`wcs`) |
| `@sunwjy/funnel-client/x-pixel` | X/Twitter Pixel (`twq`) |
| `@sunwjy/funnel-client/linkedin-insight` | LinkedIn Insight Tag (`lintrk`) |
| `@sunwjy/funnel-client/mixpanel` | Mixpanel |
| `@sunwjy/funnel-client/amplitude` | Amplitude |
| `@sunwjy/funnel-client/toss-ads` | Toss Ads Pixel (`TossPixel`) |
| `@sunwjy/funnel-client/reddit-pixel` | Reddit Pixel (`rdt`) |
| `@sunwjy/funnel-client/daangn-ads` | Daangn Business conversion tracking (`karrotPixel`) |
| `@sunwjy/funnel-client/pinterest-tag` | Pinterest Tag (`pintrk`) |

Every factory accepts a typed config object; config passed to `initialize()` overrides it key-by-key at runtime.

See the [repository README](https://github.com/sunwjy/funnel#readme) for full event mapping tables, user identification (`setUser`/`resetUser`), Consent Mode (`setConsent` + per-plugin `consentRequired` gating), pre-initialize event queueing, and event deduplication (`eventId`) details.

## License

MIT © sunwjy
