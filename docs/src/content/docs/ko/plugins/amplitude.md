---
title: Amplitude
description: window.amplitude를 통해 Funnel의 GA4 이벤트를 Amplitude로 전송합니다.
sidebar:
  order: 13
---

Amplitude 플러그인은 Funnel을 **Amplitude** 프로덕트 분석에 연결합니다. Funnel의 GA4 표준 이벤트를
`window.amplitude`를 통해 Amplitude로 전달하며, 각 이벤트 이름을 Title Case로 변환합니다
(`add_to_cart` → `Add To Cart`).

## 무엇을 추적하나요

모든 Funnel 이벤트가 Title Case 이름으로 전달됩니다:

| Funnel 이벤트 (GA4) | Amplitude 이벤트 |
| --- | --- |
| `page_view` | `Page View` |
| `view_item` | `View Item` |
| `add_to_cart` | `Add To Cart` |
| `purchase` | `Purchase` |
| …그 외 모든 이벤트 | GA4 이름의 Title Case |

이벤트 파라미터는 그대로 전달되며, `items` 배열은 Amplitude에 적합한 속성으로 평탄화됩니다.
`purchase`와 `refund`의 경우 GA4의 `value`가 Amplitude의 `revenue`로 매핑됩니다. 각 이벤트는
Funnel의 `eventId`로 `insert_id`를 설정해 서버사이드 중복 제거를 지원합니다.

## 시작하기 전에

- **Amplitude API 키**.
- 페이지에 로드된 Amplitude 브라우저 SDK — Funnel이 실행되기 전에 `window.amplitude`가 존재해야
  합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createAmplitudePlugin } from "@sunwjy/funnel-client/amplitude";

export const funnel = new Funnel({
  plugins: [createAmplitudePlugin()],
  debug: true,
});

funnel.initialize({
  amplitude: {
    apiKey: "your_api_key",
    // amplitude.init(apiKey, options)로 전달 — 선택 사항
    options: { serverZone: "EU" },
  },
});
```

`consentRequired: true`는 선택 사항입니다 — 설정하면 `funnel.setConsent(...)`로
`analytics_storage`를 허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 99,
  transaction_id: "T-4004",
});
```

이 호출은 `amplitude.track("Purchase", { currency: "USD", revenue: 99, transaction_id: "T-4004", insert_id: "..." })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- Amplitude의 **User Look-Up** 또는 **Live** 스트림으로 이벤트가 실시간으로 도착하는지
  확인하세요.

## 참고

- **SSR 안전.** `window`(또는 `window.amplitude`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- `funnel.setUser(...)`는 `amplitude.setUserId(user_id)`를 호출하고 나머지 속성을
  `amplitude.Identify()` 인스턴스로 설정합니다(실제 SDK는 평범한 객체를 무시합니다).
- `funnel.resetUser()`는 `amplitude.setUserId(null)`을 호출합니다(로그아웃).
- `purchase`와 `refund`만 `value` → `revenue`로 재매핑하며, 그 외 이벤트는 `value`를 그대로
  유지합니다.
- EU 데이터 레지던시는 `options.serverZone: "EU"`를 사용하세요.
