---
title: Plugins
description: One catalog page per analytics platform.
sidebar:
  order: 0
---

Each plugin maps Funnel's GA4-standard events into one platform's native format. Connect as
many as you need. A single [`track()`](/start-here/quickstart/) call reaches all of them.

Every plugin page follows the same shape: what it tracks, what to prepare (IDs, base
snippets), how to install and initialize it, the connection code, how to verify it, and any
caveats (such as SSR).

```ts
// Import only what you use (every plugin is a named factory).
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";
```

The catalog covers GA4, Google Tag Manager, server-side GTM, the Meta Pixel and Conversions
API, Google Ads, TikTok, Kakao, Naver, X, LinkedIn, Mixpanel, Amplitude, Toss Ads, Reddit,
Daangn, and Pinterest. Individual pages are listed in the sidebar.
