---
title: 여러 플러그인 연결
description: 여러 분석 플랫폼을 한 번에 연결하고, 각 플러그인 이름으로 설정하기.
sidebar:
  order: 3
---

Funnel의 핵심은 하나의 이벤트를 여러 플랫폼으로 보내는 것입니다. 플랫폼을 더 추가하는 일은 배열에
플러그인을 더 넣는 것일 뿐이며 — `track()` 호출은 전혀 바뀌지 않습니다.

## 여러 플러그인 연결하기

각 팩토리를 서브패스에서 import하고 `plugins`에 나열합니다:

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";
import { createKakaoPixelPlugin } from "@sunwjy/funnel-client/kakao-pixel";

export const funnel = new Funnel({
  plugins: [
    createGA4Plugin(),
    createMetaPixelPlugin(),
    createTikTokPixelPlugin(),
    createKakaoPixelPlugin(),
  ],
  debug: true,
});
```

## 각 플러그인을 이름으로 설정하기

`initialize()`는 각 플러그인의 `name`을 키로 하는 맵을 받습니다. import하는 팩토리가 키를
결정합니다 — 예를 들어 `createMetaPixelPlugin()`은 `"meta-pixel"`로 등록됩니다.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
  "tiktok-pixel": { pixelId: "CXXXXXXXXXXXXXXXXXXX" },
  "kakao-pixel": { trackId: "1234567890123456789" },
});
```

플러그인 `name` 문자열은 안정적인 식별자입니다:

`ga4`, `gtm`, `sgtm`, `meta-pixel`, `meta-conversion-api`, `google-ads`, `tiktok-pixel`,
`kakao-pixel`, `naver-ad`, `x-pixel`, `linkedin-insight`, `mixpanel`, `amplitude`, `toss-ads`,
`reddit-pixel`, `daangn-ads`, `pinterest-tag`.

:::note[설정을 넣을 수 있는 곳]
설정은 팩토리(`createGA4Plugin({ measurementId })`)에 넘기거나 `initialize()`에 넘길 수
있습니다. 둘 다 있으면 `initialize()`에 넘긴 값이 이깁니다. 런타임에 환경 변수에서 읽어올 때는
`initialize()` 시점에 ID를 넘기는 편이 편리합니다.
:::

## 한 번 추적하면 모두에게 도달

이제 단 한 번의 `track()` 호출이 연결된 모든 플러그인으로 디스패치되고, 각자 GA4 이벤트를 자기
형식으로 매핑합니다:

```ts
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
});
//   → GA4          gtag("event", "purchase", …)
//   → Meta Pixel   fbq("track", "Purchase", …)
//   → TikTok       ttq.track("CompletePayment", …)
//   → Kakao Pixel  …자체 구매 호출
```

## debug:true로 확인하기

연결 작업 중에는 생성자에 `debug: true`를 켜세요. Funnel이 각 플러그인의 디스패치를 콘솔에
로그하므로, 모든 플랫폼이 이벤트를 받았는지 확인할 수 있습니다:

```text
[funnel] Plugin "ga4" initialized
[funnel] Plugin "meta-pixel" initialized
[funnel] "ga4" tracked "purchase" { transaction_id: "T-1", currency: "KRW", value: 29000 }
[funnel] "meta-pixel" tracked "purchase" { transaction_id: "T-1", currency: "KRW", value: 29000 }
```

프로덕션에서는 끄세요.

## 실전 오류 격리

여러 플러그인을 연결했을 때, 한 플랫폼이 말썽을 부려도 분석 전체가 무너지지 않길 원하게 됩니다.
Funnel이 이를 보장합니다: 각 플러그인은 try/catch 안에서 실행되므로, 하나가 throw해도 나머지는
여전히 이벤트를 받습니다.

```ts
funnel.track("page_view", { page_title: "Home" });
//   → ga4         ✓ 추적됨
//   → meta-pixel  ✗ throw (예: fbq 미로딩) → 로그되고 격리됨
//   → tiktok      ✓ 추적됨   (meta-pixel 실패와 무관)
```

기본적으로 실패는 `console.error`로 로그됩니다. 실패를 직접 모니터링으로 보내려면 생성자에
`onError`를 넘기세요:

```ts
const funnel = new Funnel({
  plugins: [/* ... */],
  onError: (error, { plugin, phase, eventName }) => {
    // phase는 "initialize" | "track" | "setUser" | "resetUser" | "setConsent"
    myErrorReporter.capture(error, { plugin, phase, eventName });
  },
});
```

격리 보장은 `onError` 제공 여부와 무관하게 유지됩니다.

## 다음으로

- [프레임워크 연동](/ko/guides/framework-integration/) — React, Next.js, 순수 HTML에 연결하기.
- [서버사이드 & 중복 제거](/ko/guides/server-side-dedup/) — Meta Pixel과 Conversions API 짝짓기.
- [플러그인 카탈로그](/ko/plugins/) — 모든 플랫폼의 설정 세부사항.
