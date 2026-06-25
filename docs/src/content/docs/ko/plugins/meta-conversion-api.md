---
title: Meta Conversions API
description: Funnel의 GA4 이벤트를 서버로 전달하여 Meta Conversions API로 전송합니다.
sidebar:
  order: 5
---

Meta Conversions API(CAPI) 플러그인은 GA4 기반 이벤트 데이터를 브라우저에서 수집하여
**직접 관리하는 서버 엔드포인트**로 전달하고, 서버가 이를 **Meta의 Conversions API**로
전송합니다. 브라우저 측 [Meta Pixel](/ko/plugins/meta-pixel/)과 `eventId`를 공유하므로 Meta가
동일 이벤트의 서버·브라우저 사본을 중복 제거할 수 있습니다.

## 무엇을 추적하나요

매핑된 GA4 이벤트는 Meta 이벤트 이름이 됩니다(`purchase` → `Purchase`, `add_to_cart` →
`AddToCart`, `view_item` → `ViewContent` 등). 매핑되지 않은 이벤트는 원래 이름으로 전달됩니다.
각 페이로드에는 `event_id`, `event_time`, `event_source_url`, `action_source: "website"`,
`custom_data`(currency / value / `content_ids` / `contents` / `order_id` …), `user_data`가
포함됩니다. PII 필드(`em`, `ph`, `fn`, `ln`, `external_id`)는 전송 전 **브라우저에서 SHA-256으로
해시**됩니다 — SubtleCrypto를 사용할 수 없으면 평문으로 보내지 않고 생략합니다. 플러그인은
`_fbp` / `_fbc` 쿠키(있을 경우 `fbclid` 쿼리 파라미터로 `fbc` 합성)와 사용자 에이전트도
수집합니다.

## 시작하기 전에

이것은 **서버 릴레이** 플러그인입니다: **브라우저 픽셀 전역 객체가 없습니다**. JSON 페이로드를
받아 액세스 토큰과 함께 Meta CAPI로 전달하는 서버 엔드포인트가 필요합니다 — 액세스 토큰은
브라우저가 아니라 **서버**에 둡니다. 다음을 제공하세요:

- **endpoint** — Meta CAPI로 중계하는 서버 URL.
- 선택적으로 **testEventCode**(예: `TEST12345`) — Events Manager의 Test Events 탭에 이벤트를
  표시합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaConversionApiPlugin } from "@sunwjy/funnel-client/meta-conversion-api";

export const funnel = new Funnel({
  plugins: [createMetaConversionApiPlugin()],
  debug: true,
});

funnel.initialize({
  "meta-conversion-api": {
    endpoint: "https://api.example.com/meta-capi",
    testEventCode: "TEST12345", // 선택
  },
});
```

## 이벤트 추적

```ts
// setUser를 호출하면 해시된 PII가 자동으로 첨부됩니다
funnel.setUser({ email: "user@example.com" });

funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 29000, quantity: 1 }],
});
```

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **네트워크 탭**에서 `endpoint`로 향하는 `POST`를 확인합니다.
- `testEventCode`를 설정하고 Meta Events Manager의 **Test Events** 탭을 엽니다.
- `event_id`가 Meta Pixel의 것과 일치해 Meta가 둘을 중복 제거하는지 확인합니다.

## 참고

- **SSR 안전**: `window`가 없거나 `endpoint`가 비어 있으면 `track`은 아무 동작을 하지 않습니다.
- 해싱은 캐시됩니다: `setUser`가 PII를 한 번 해시하고 이후의 모든 `track`이 그 다이제스트를
  재사용합니다. `resetUser`가 이를 비웁니다.
- `consentRequired: true`로 설정하면 `setConsent`를 통해 `ad_storage`가 허용될 때까지 이벤트를
  버립니다. 기본값은 게이팅 없음(플랫폼 위임)입니다.
- 동일한 `transaction_id`를 사용하고 공유 `eventId`에 의존해 브라우저 Meta Pixel과 중복을
  제거하세요.
