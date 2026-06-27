---
title: X Pixel
description: window.twq를 통해 Funnel의 GA4 이벤트를 X(트위터) 픽셀로 전송합니다.
sidebar:
  order: 10
---

X Pixel 플러그인은 Funnel을 **X(트위터) 광고**에 연결합니다. Funnel의 GA4 표준 이벤트를 X
Pixel의 네이티브 이벤트 형식으로 매핑하고 `window.twq`를 통해 전송합니다. 매핑되지 않은 이벤트는
원래 GA4 이름 그대로 커스텀 이벤트로 전송됩니다.

## 무엇을 추적하나요

| Funnel 이벤트 (GA4) | X Pixel 이벤트 |
| --- | --- |
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `Lead` |
| `add_payment_info` | `AddPaymentInfo` |

그 외 이벤트는 `twq("event", "<ga4 이름>", ...)` 형태의 커스텀 이벤트로 전달됩니다. 모든 이벤트는
`event_id`(Funnel의 `eventId`)를 담고 있어 서버사이드 전환과 중복 제거할 수 있습니다.

## 시작하기 전에

- X 광고 계정에서 발급받은 **X Pixel ID**.
- 페이지 `<head>`에 로드된 X 기본 픽셀 스니펫(uwt.js). Funnel이 실행되기 전에 `window.twq`가
  존재해야 합니다. Funnel은 이벤트만 전송하며 픽셀을 직접 로드하지 않습니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createXPixelPlugin } from "@sunwjy/funnel-client/x-pixel";

export const funnel = new Funnel({
  plugins: [createXPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "x-pixel": { pixelId: "abc12" },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 49,
  transaction_id: "T-1001",
});
```

이 호출은 `twq("event", "Purchase", { currency: "USD", value: 49, order_id: "T-1001", event_id: "..." })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 브라우저 콘솔에 기록됩니다.
- **X Pixel Helper** 브라우저 확장 프로그램을 설치하면 발생하는 이벤트를 확인할 수 있습니다.
- DevTools에서 `window.twq`가 존재하는지 확인하고, Network 탭에서 `analytics.twitter.com`으로
  가는 요청을 관찰하세요.

## 참고

- **SSR 안전.** `window`(또는 `window.twq`)가 없으면 플러그인은 아무 동작도 하지 않습니다. 서버에서
  오류가 발생하지 않습니다.
- **고급 매칭(Advanced matching).** `funnel.setUser({ email, phone_number })`를 호출하면 정규화된
  `email_address` / `phone_number`(E.164)가 이벤트 파라미터로 첨부됩니다. 픽셀이 클라이언트에서
  SHA-256으로 해시하므로 Funnel은 정규화된 평문을 전송합니다(미리 해시하면 매칭이 깨집니다).
- 항목별 `price`/`quantity`가 있으면 `contents` 배열로 전송됩니다. 없으면 `content_ids` +
  `content_type: "product"`로 축약됩니다.
