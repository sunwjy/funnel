---
title: Meta Pixel
description: Funnel의 GA4 이벤트를 window.fbq를 통해 Meta Pixel 표준 이벤트로 매핑합니다.
sidebar:
  order: 4
---

Meta Pixel 플러그인은 Funnel의 GA4 기반 이벤트를 **Meta Pixel**(Facebook Pixel) 표준
이벤트로 변환하여 `window.fbq`를 통해 전송합니다.

## 무엇을 추적하나요

매핑된 GA4 이벤트는 Meta 표준 이벤트가 됩니다 — 예: `purchase` → `Purchase`,
`add_to_cart` → `AddToCart`, `begin_checkout` → `InitiateCheckout`, `view_item` →
`ViewContent`, `sign_up` → `CompleteRegistration`, `generate_lead` → `Lead`, `search` →
`Search`. GA4 `items`는 `content_ids` / `contents` / `num_items`로 재구성됩니다. 매핑에 **없는**
이벤트는 `fbq("trackCustom", <eventName>, ...)`로 커스텀 이벤트로 전송됩니다. 모든 호출에는
Conversions API와의 브라우저↔서버 중복 제거를 위한 `{ eventID: context.eventId }`가 포함됩니다.

## 시작하기 전에

- Meta Events Manager에서 발급받은 **Meta Pixel ID**.
- 페이지 `<head>`에 로드된 표준 Meta Pixel 기본 코드 — Funnel이 실행되기 전에 `window.fbq`가
  존재해야 합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createMetaPixelPlugin()],
  debug: true,
});

funnel.initialize({
  "meta-pixel": { pixelId: "1234567890" },
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

이는 `fbq("track", "Purchase", { currency, value, content_ids, contents, num_items,
order_id }, { eventID })`를 실행합니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **Meta Pixel Helper** 브라우저 확장 프로그램을 설치해 이벤트 실행을 확인합니다.
- Meta Events Manager의 **Test Events** 탭을 사용합니다.
- DevTools 네트워크 탭에서 `facebook.com/tr`로 향하는 `fbq` 요청을 확인합니다.

## 참고

- **SSR 안전**: `window` 또는 `window.fbq`가 없으면 모든 메서드가 조기 반환합니다.
- `setUser`는 Advanced Matching을 위해 `fbq("init", pixelId, { em, ph, fn, ln, external_id })`를
  다시 실행합니다. Meta Pixel에는 이 데이터를 **지우는 문서화된 방법이 없으므로** 이 플러그인은
  `resetUser`를 구현하지 않습니다 — 데이터는 페이지가 언로드될 때까지 유지됩니다. 깨끗한 상태가
  필요하면 로그아웃 후 페이지를 새로고침하세요.
- `setConsent`는 `ad_storage`에서 유도된 Meta의 이진 동의 API를 사용합니다
  (`granted` → `grant`, 그 외 → `revoke`).
- 공유된 `eventId`로 서버 이벤트를 중복 제거하려면 [Meta Conversions API](/ko/plugins/meta-conversion-api/)
  플러그인과 함께 사용하세요.
