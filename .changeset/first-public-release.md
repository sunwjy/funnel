---
"@sunwjy/funnel-core": minor
"@sunwjy/funnel-client": minor
---

First public release to npm.

- `@sunwjy/funnel-core`: GA4-based `EventMap` type definitions, `FunnelPlugin` interface, `Funnel` dispatcher with error-isolated plugin execution, and `EventContext` with auto-generated `eventId` for server-side deduplication.
- `@sunwjy/funnel-client`: 16 client-side plugins (GA4, GTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok Pixel, Kakao Pixel, Naver Ad, X Pixel, LinkedIn Insight, Mixpanel, Amplitude, Toss Ads, Reddit Pixel, Daangn Ads, Pinterest Tag) with subpath exports for tree-shaking and SSR-safe guards.
