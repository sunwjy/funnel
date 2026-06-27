---
title: Reddit Pixel
description: window.rdt를 통해 Funnel의 GA4 이벤트를 Reddit 픽셀로 전송합니다.
sidebar:
  order: 15
---

Reddit Pixel 플러그인은 Funnel을 **Reddit 광고**에 연결합니다. Funnel의 GA4 표준 이벤트를 Reddit
Pixel의 표준 이벤트로 매핑하고 `window.rdt`를 통해 전송합니다. 매핑되지 않은 이벤트는 원래 GA4
이름을 보존한 `Custom` 이벤트로 전송됩니다.

## 무엇을 추적하나요

| Funnel 이벤트 (GA4) | Reddit Pixel 이벤트 |
| --- | --- |
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `add_to_wishlist` | `AddToWishlist` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `SignUp` |
| `search` | `Search` |

그 외 이벤트는 `rdt("track", "Custom", { ..., customEventName: "<ga4 이름>" })`로 전송됩니다. 모든
이벤트는 `conversionId`(Funnel의 `eventId`)를 담고 있어 Reddit의 Conversions API(CAPI)와 중복
제거할 수 있습니다.

## 시작하기 전에

- Reddit 광고에서 발급받은 **Reddit Pixel(광고주) ID**.
- 페이지에 로드된 Reddit Pixel 기본 스니펫. Funnel이 실행되기 전에 `window.rdt`가 존재해야
  합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createRedditPixelPlugin } from "@sunwjy/funnel-client/reddit-pixel";

export const funnel = new Funnel({
  plugins: [createRedditPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "reddit-pixel": { pixelId: "t2_abc123" },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 75,
  transaction_id: "T-6006",
});
```

이 호출은 `rdt("track", "Purchase", { currency: "USD", value: 75, transactionId: "T-6006", conversionId: "..." })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- **Reddit Pixel Helper** 브라우저 확장 프로그램을 설치하면 발생하는 이벤트를 확인할 수 있습니다.
- DevTools에서 `window.rdt`가 존재하는지 확인하고 Network 탭에서 `events.reddit.com`으로 가는
  요청을 관찰하세요.

## 참고

- **SSR 안전.** `window`(또는 `window.rdt`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- 항목별 `id`/`name`/`category`는 `products` 배열로 전송되며, 집계된 `itemCount`도 함께
  전송됩니다.
- 모든 이벤트에서 `conversionId`는 Funnel의 `eventId`로 설정됩니다. Reddit CAPI와 함께 사용해
  브라우저와 서버 전환을 중복 제거하세요.
