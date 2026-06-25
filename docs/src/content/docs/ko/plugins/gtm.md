---
title: Google Tag Manager
description: Funnel의 GA4 형식 이벤트를 GTM dataLayer에 push하여 컨테이너에서 라우팅합니다.
sidebar:
  order: 2
---

GTM 플러그인은 Funnel 이벤트를 **Google Tag Manager**의 `window.dataLayer`에 push합니다.
이후 GTM 컨테이너가 자체 트리거에 따라 각 이벤트를 적절한 태그로 라우팅합니다 — 따라서
전송 대상은 코드가 아니라 GTM에서 설정합니다.

## 무엇을 추적하나요

각 Funnel 이벤트는 `event`가 GA4 이벤트 이름으로 설정되고 `event_id`가 포함된
`dataLayer.push`가 됩니다. 이커머스 이벤트(`view_item`, `add_to_cart`, `purchase`, `refund`,
`view_promotion` 등)는 GTM의 GA4 이커머스 규약에 따라 `items`/`currency`/`value`/`coupon`
필드를 `ecommerce` 객체로 감싸며, 커스텀 파라미터는 최상위에 그대로 둡니다. 각 이커머스
push 전에 이전 `ecommerce` 객체를 비워(`dataLayer.push({ ecommerce: null })`) 이벤트 간에
오래된 항목이 새지 않도록 합니다.

## 시작하기 전에

- **GTM 컨테이너 ID**(`GTM-XXXXXXX` 형태).
- 페이지에 설치된 표준 GTM 컨테이너 스니펫 — `window.dataLayer`가 존재해야 합니다.
- push된 이벤트를 소비하도록 GTM 대시보드에서 태그와 트리거를 설정합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGTMPlugin } from "@sunwjy/funnel-client/gtm";

export const funnel = new Funnel({
  plugins: [createGTMPlugin()],
  debug: true,
});

funnel.initialize({
  gtm: { containerId: "GTM-XXXXXXX" },
});
```

## 이벤트 추적

```ts
funnel.track("add_to_cart", {
  currency: "KRW",
  value: 12000,
  items: [{ item_id: "SKU-1", item_name: "T-Shirt", price: 12000, quantity: 1 }],
});
```

이는 `{ event: "add_to_cart", event_id: "...", ecommerce: { items, currency, value } }`를
push합니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **GTM 미리보기 / Tag Assistant**를 열어 이벤트 도착과 태그 실행을 확인합니다.
- 브라우저 DevTools 콘솔에서 `window.dataLayer`를 직접 확인합니다.

## 참고

- **SSR 안전**: `window`가 없으면 모든 메서드가 조기 반환합니다.
- `containerId`는 일회성 `gtm.start` / `gtm.js` 부트스트랩 항목을 push하는 데만 사용되며
  검증되지 않습니다. 대부분의 환경에서는 공식 GTM 스니펫을 별도로 로드합니다.
- `setConsent`는 페이지에 `gtag` 스텁(GTM이 동의에 사용하는
  `function gtag(){dataLayer.push(arguments)}` 패턴)이 있을 때만 Consent Mode로 전달합니다.
  없으면 동의 업데이트는 무시됩니다.
