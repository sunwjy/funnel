---
title: TikTok Pixel
description: Funnel의 GA4 이벤트를 window.ttq를 통해 TikTok Pixel 표준 이벤트로 매핑합니다.
sidebar:
  order: 7
---

TikTok Pixel 플러그인은 Funnel의 GA4 기반 이벤트를 **TikTok Pixel** 표준 이벤트로 변환하여
`window.ttq`를 통해 전송합니다.

## 무엇을 추적하나요

`page_view`는 `ttq.page()`를 호출합니다. 매핑된 GA4 이벤트는 TikTok 표준 이벤트가 됩니다 —
예: `purchase` → `CompletePayment`, `add_to_cart` → `AddToCart`, `begin_checkout` →
`InitiateCheckout`, `view_item` → `ViewContent`, `sign_up` → `CompleteRegistration`,
`generate_lead` → `SubmitForm`, `search` → `Search`. GA4 `items`는 TikTok `contents`가 됩니다.
매핑에 없는 이벤트는 `ttq.track(<eventName>, ...)`로 커스텀 이벤트로 전송됩니다. 모든 호출에는
중복 제거를 위한 `event_id`가 포함됩니다.

## 시작하기 전에

- TikTok Ads Manager에서 발급받은 **TikTok Pixel ID**.
- Funnel이 실행되기 전에 `window.ttq`가 존재하도록 페이지에 로드된 표준 TikTok Pixel 기본 코드.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";

export const funnel = new Funnel({
  plugins: [createTikTokPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "tiktok-pixel": { pixelId: "CXXXXXXXXXXXXXXXXXXX" },
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

이는 `ttq.track("CompletePayment", { contents, currency, value, order_id, event_id })`를
실행합니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **TikTok Pixel Helper** 브라우저 확장 프로그램을 설치해 이벤트 실행을 확인합니다.
- TikTok Events Manager의 **Test Events**를 사용합니다.

## 참고

- **SSR 안전**: `window` 또는 `window.ttq`가 없으면 모든 메서드가 조기 반환합니다.
- `select_item`은 의도적으로 매핑하지 **않습니다**: TikTok의 `ClickButton`은 비제품 CTA용이므로,
  PLP 클릭이 해당 카운터를 부풀리지 않도록 커스텀 이벤트로 전달됩니다.
- `setUser`는 고급 매칭을 위해 `ttq.identify({ email, phone_number, external_id })`를 호출합니다.
  TikTok에는 "식별 해제" 호출이 없으므로 이 플러그인은 `resetUser`를 구현하지 않습니다 — 필요하면
  로그아웃 후 페이지를 새로고침하세요.
- `consentRequired: true`로 설정하면 `setConsent`를 통해 `ad_storage`가 허용될 때까지 이벤트를
  버립니다. 기본값은 게이팅 없음(플랫폼 위임)입니다.
