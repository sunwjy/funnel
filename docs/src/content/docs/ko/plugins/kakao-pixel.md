---
title: Kakao Pixel
description: Funnel의 GA4 이벤트를 window.kakaoPixel을 통해 Kakao Pixel 표준 이벤트로 매핑합니다.
sidebar:
  order: 8
---

Kakao Pixel 플러그인은 Funnel의 GA4 기반 이벤트를 `window.kakaoPixel`을 통해 **Kakao Pixel**
표준 이벤트로 변환합니다.

## 무엇을 추적하나요

매핑된 각 GA4 이벤트는 전용 Kakao Pixel 메서드를 호출합니다: `page_view` → `pageView()`,
`search` → `search()`, `view_item` → `viewContent()`, `add_to_cart` → `addToCart()`,
`begin_checkout` / `view_cart` → `viewCart()`, `purchase` → `purchase()`, `sign_up` →
`completeRegistration()`, `generate_lead` → `participation()`. `purchase`의 경우 GA4 `items`가
Kakao `products`로 매핑되며, `total_price`는 항목별 가격에서 계산됩니다(없으면 GA4 최상위
`value`로 대체). Kakao Pixel은 **커스텀 이벤트와 중복 제거를 지원하지 않으므로**, 매핑되지 않은
이벤트(`view_item_list`, `select_item`, `refund` …)는 조용히 버려집니다.

## 시작하기 전에

- Kakao Moment / 카카오비즈니스에서 발급받은 **Kakao Pixel Track ID**.
- Funnel이 실행되기 전에 `window.kakaoPixel`이 존재하도록 로드된 표준 Kakao Pixel 기본 스니펫.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createKakaoPixelPlugin } from "@sunwjy/funnel-client/kakao-pixel";

export const funnel = new Funnel({
  plugins: [createKakaoPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "kakao-pixel": { trackId: "1234567890123456789" },
});
```

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 29000, quantity: 1 }],
});
```

이는 `kakaoPixel(trackId).purchase({ total_quantity, total_price, currency, products })`를
호출합니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- Kakao 개발자 콘솔의 Kakao Pixel & SDK 디버깅 도구를 사용합니다.
- DevTools 네트워크 탭에서 `kakaoPixel` 요청을 확인합니다.

## 참고

- **SSR 안전**: `window` 또는 `window.kakaoPixel`(또는 `trackId`)이 없으면 `track`은 아무 동작을
  하지 않습니다.
- **커스텀 이벤트 없음 / `event_id` 중복 제거 없음**: 위에 매핑된 이벤트 집합만 Kakao에
  도달하며, 나머지는 의도적으로 버려집니다.
- `purchase`에서 `currency`가 제공되지 않으면 기본값은 `"KRW"`입니다.
- `consentRequired: true`로 설정하면 `setConsent`를 통해 `ad_storage`가 허용될 때까지 이벤트를
  버립니다. 기본값은 게이팅 없음(플랫폼 위임)입니다.
