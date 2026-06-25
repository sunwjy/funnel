---
title: Toss Ads
description: window.TossPixel을 통해 Funnel의 GA4 이벤트를 토스애즈 픽셀로 전송합니다.
sidebar:
  order: 14
---

Toss Ads 플러그인은 Funnel을 **토스애즈(Toss Ads)**에 연결합니다. Funnel의 GA4 표준 이벤트를 Toss
Pixel의 표준 이벤트로 매핑하고 `window.TossPixel` 인스턴스를 통해 전송합니다.
`window.TossPixel(conversionCode)`는 표준 이벤트별 메서드(`pageView`, `productView`,
`purchase`, …)를 가진 객체를 반환합니다.

## 무엇을 추적하나요

| Funnel 이벤트 (GA4) | Toss Pixel 메서드 |
| --- | --- |
| `page_view` | `pageView` |
| `view_item` | `productView` |
| `add_to_cart` | `addToCart` |
| `add_to_wishlist` | `addToWishlist` |
| `begin_checkout` | `initiateCheckout` |
| `purchase` | `purchase` |
| `search` | `search` |
| `sign_up` | `signUp` |
| `login` | `signIn` |
| `generate_lead` | `lead` |

Toss에 대응 항목이 없는 이벤트(예: `view_item_list`, `select_item`, `remove_from_cart`,
`refund`)는 조용히 드롭됩니다. Toss에는 매칭되는 메서드도, 커스텀 이벤트 채널도 없습니다.

## 시작하기 전에

- 토스애즈 대시보드에서 광고 계정별로 발급받은 **Toss Ads 전환 코드(conversion code)**.
- 페이지에 로드된 Toss Pixel 기본 스니펫. Funnel이 실행되기 전에 `window.TossPixel`이 존재해야
  합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createTossAdsPlugin } from "@sunwjy/funnel-client/toss-ads";

export const funnel = new Funnel({
  plugins: [createTossAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "toss-ads": { conversionCode: "your_conversion_code" },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-5005",
  items: [{ item_id: "SKU-1", item_name: "T-shirt", price: 29000, quantity: 1 }],
});
```

이 호출은 픽셀의 `purchase({ order_id: "T-5005", revenue: 29000, total_quantity: 1, currency: "KRW", products: [...], custom_param1: "<eventId>" })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- DevTools에서 `window.TossPixel`이 존재하는지 확인하고 Network 탭에서 픽셀 요청을 관찰하세요.
- 토스애즈 대시보드에서 전환을 확인하세요(처리에 시간이 걸릴 수 있습니다).

## 참고

- **SSR 안전.** `window`(또는 `window.TossPixel`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- Toss Pixel에는 **네이티브 중복 제거 ID 필드가 없습니다.** Funnel은 서버사이드 대조를 위해
  `custom_param1`로 `eventId`를 전달하며, 구매/체크아웃 시 `order_id`는 `transaction_id`로
  설정됩니다.
- `currency`가 제공되지 않으면 기본 통화는 **KRW**입니다.
- Toss는 사용자 식별 API를 노출하지 않으므로 `setUser`는 의도적으로 구현되지 않았습니다.
