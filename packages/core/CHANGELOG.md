# @sunwjy/funnel-core

## 0.3.0

### Minor Changes

- [#4](https://github.com/sunwjy/funnel/pull/4) [`d758376`](https://github.com/sunwjy/funnel/commit/d758376340b52a737dadfa9c08c0b377dde629f7) Thanks [@sunwjy](https://github.com/sunwjy)! - First public release to npm.

  - `@sunwjy/funnel-core`: GA4-based `EventMap` type definitions, `FunnelPlugin` interface, `Funnel` dispatcher with error-isolated plugin execution, and `EventContext` with auto-generated `eventId` for server-side deduplication.
  - `@sunwjy/funnel-client`: 16 client-side plugins (GA4, GTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok Pixel, Kakao Pixel, Naver Ad, X Pixel, LinkedIn Insight, Mixpanel, Amplitude, Toss Ads, Reddit Pixel, Daangn Ads, Pinterest Tag) with subpath exports for tree-shaking and SSR-safe guards.

## 0.2.0

### Minor Changes

- Platform-correctness fixes, Consent Mode v2, and DX improvements.

  **Breaking (naver-ad):** migrated to Naver's new conversion script API (`wcs.trans`) — the legacy `wcs.cnv` string assignment never recorded conversions and clobbered the real API. Plugin config keys changed from `siteId` to `accountId` (`wcs_add["wa"]`) and `siteDomain` (`wcs.inflow`). Mapping expanded: `generate_lead`→`lead`, `add_to_wishlist`, `view_item`→`view_content`, plus item `category`/`option`/`payAmount` transforms.

  **Fixes**

  - google-ads: drop unlabeled events instead of forwarding bare `gtag("event")` calls that double-counted in GA4
  - amplitude: `setUser` now builds a Browser SDK 2 `Identify` instance — plain objects were silently ignored by the real SDK
  - x-pixel: advanced matching now uses X's documented event parameters (`email_address`, E.164 `phone_number`) attached per event; the previous `twq("config", …, {em, ph_number})` call was ignored by X and pre-hashing risked a double-hash mismatch
  - gtm: only GA4 ecommerce-spec keys are nested under `ecommerce`; custom params stay at the top level of the dataLayer push

  **Features**

  - Consent Mode v2: `funnel.setConsent()` with the four Google consent signals; gtag-family plugins forward `consent update`, Meta Pixel down-maps grant/revoke, and platforms without a consent API support opt-in gating via `consentRequired: true`
  - Pre-initialize event queueing: `track()` before `initialize()` queues up to 100 events and replays them in order (eventId fixed at call time)
  - Typed factory config: every `createXxxPlugin(config?)` accepts a typed config object; `initialize()` config overrides it key-by-key
  - google-ads: `resetUser` clears enhanced-conversions `user_data` on logout
  - core: `phone_e164` PII normalization kind (X Ads format, leading `+` preserved); `PiiKind` exported

  **Performance**

  - meta-conversion-api: PII digests are computed once per `setUser` and reused across events; synthesized `fbc` stays stable across events
