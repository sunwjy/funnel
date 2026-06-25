---
title: Daangn Ads
description: window.karrotPixel을 통해 Funnel의 GA4 이벤트를 당근비즈니스 전환 추적으로 전송합니다.
sidebar:
  order: 16
---

Daangn Ads 플러그인은 Funnel을 **당근비즈니스(Daangn Business) 전환 추적 코드**에 연결합니다.
Funnel의 GA4 표준 이벤트를 당근의 표준 전환 이벤트로 매핑하고 `window.karrotPixel`을 통해
전송합니다.

## 무엇을 추적하나요

| Funnel 이벤트 (GA4) | Daangn 이벤트 |
| --- | --- |
| `page_view` | `ViewPage` |
| `view_item` | `ViewContent` (첫 번째 항목의 `id`) |
| `add_to_cart` | `AddToCart` (`products`) |
| `sign_up` | `CompleteRegistration` |
| `purchase` | `Purchase` (`total_price`, `total_quantity`, `products`) |

당근의 픽셀은 이 고정된 표준 이벤트 세트만 노출합니다 — 커스텀 이벤트 API가 없습니다. 매핑되지
않은 GA4 이벤트(예: `view_item_list`, `select_item`, `search`, `refund`)는 조용히 드롭됩니다.

## 시작하기 전에

- 당근비즈니스 → 광고도구 → 전환 추적 관리에서 발급받은 **당근 전환 추적 코드 ID**.
- 페이지에 로드된 당근 픽셀 로더
  (`https://karrot-pixel.business.daangn.com/0.2/karrot-pixel.umd.js`) — Funnel이 실행되기 전에
  `window.karrotPixel`이 존재해야 합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createDaangnAdsPlugin } from "@sunwjy/funnel-client/daangn-ads";

export const funnel = new Funnel({
  plugins: [createDaangnAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "daangn-ads": { trackId: "your_track_id" },
});
```

`consentRequired: true`는 선택 사항입니다 — 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 15000,
  transaction_id: "T-7007",
  items: [{ item_id: "SKU-9", item_name: "Mug", price: 15000, quantity: 1 }],
});
```

이 호출은 `karrotPixel.track("Purchase", { total_price: "15000", total_quantity: "1", products: [{ id: "SKU-9", name: "Mug", quantity: 1, price: 15000 }] })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- DevTools에서 `window.karrotPixel`이 존재하는지 확인하고 Network 탭에서 픽셀 요청을 관찰하세요.
- 당근비즈니스 → 전환 추적 관리에서 전환을 확인하세요(처리에 시간이 걸릴 수 있습니다).

## 참고

- **SSR 안전.** `window`(또는 `window.karrotPixel`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- `Purchase` 총계(`total_price`, `total_quantity`)는 당근 스니펫 규약에 따라 **문자열**로
  전송됩니다. `total_price`는 항목별 `price × quantity`로 계산되며, 항목별 가격이 없으면 GA4
  최상위 `value`로 대체됩니다.
- 당근의 픽셀에는 **클라이언트/서버 이벤트 ID나 중복 제거 파라미터가 없으므로** Funnel의
  `eventId`는 전달되지 않습니다.
- 사용자 식별 API가 노출되지 않으므로 `setUser`는 의도적으로 구현되지 않았습니다.
