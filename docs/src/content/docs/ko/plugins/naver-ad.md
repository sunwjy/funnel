---
title: Naver Ad
description: Funnel의 GA4 이벤트를 window.wcs를 통해 네이버 전환 추적으로 변환합니다.
sidebar:
  order: 9
---

Naver Ad 플러그인은 Funnel의 GA4 기반 이벤트를 `window.wcs`를 통해 **네이버** 전환 추적
호출로 변환하며, 네이버의 현재 `wcs.trans` 전환 스크립트 API를 사용합니다(레거시
`wcs.cnv`-문자열 API는 지원 중단되어 지원하지 않습니다).

## 무엇을 추적하나요

`page_view`는 `wcs_do()`를 통해 네이버 페이지뷰 비콘을 실행합니다. 매핑된 GA4 이벤트는 `_conv`
객체를 만들어 `wcs.trans(_conv)`로 전달합니다 — 예: `purchase` → `purchase`, `sign_up` →
`sign_up`, `add_to_cart` → `add_to_cart`, `generate_lead` → `lead`, `add_to_wishlist` →
`add_to_wishlist`, `begin_checkout` → `begin_checkout`, `view_item` → `view_content`. GA4
`items`는 네이버 전환 항목(id, name, quantity, `payAmount`, category, option)이 됩니다. 네이버는
고정된 전환 분류 체계를 가지므로 매핑되지 않은 이벤트는 조용히 무시됩니다.

## 시작하기 전에

- **네이버공통키** — `wcs_add["wa"]`로 등록되며 여기서는 `accountId`로 전달합니다.
- `window.wcs`가 존재하도록 설치된 네이버 공통 스크립트 `//wcs.naver.net/wcslog.js`. `wcs.trans`를
  지원하는 버전인지 확인하세요(오래된 스크립트는 전환에 대해 아무 동작을 하지 않습니다).
- 선택적으로 `wcs.inflow()` 쿠키 도메인 설정을 위한 **사이트 도메인**.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createNaverAdPlugin } from "@sunwjy/funnel-client/naver-ad";

export const funnel = new Funnel({
  plugins: [createNaverAdPlugin()],
  debug: true,
});

funnel.initialize({
  "naver-ad": {
    accountId: "abcdef0123456789",
    siteDomain: "https://example.com", // 선택
  },
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

이는 `wcs.trans({ type: "purchase", id: "T-1", value: "29000", items: [...] })`를 호출합니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- DevTools 네트워크 탭에서 `wcs.naver.net`으로 향하는 요청을 확인합니다.
- **네이버 검색광고 / 네이버 성과** 대시보드에서 전환 보고서를 확인합니다.

## 참고

- **SSR 안전**: `window` 또는 `window.wcs`가 없으면 `track`은 아무 동작을 하지 않습니다.
- 전환 `value`는 **문자열**로 전송됩니다(네이버 가이드 요구사항). 최상위 `value`가 없는
  `purchase`의 경우 항목별 `payAmount`의 합으로 대체됩니다.
- `purchase`에서는 `transaction_id`가 전환 `id`로 사용됩니다.
- 매핑된 전환 분류 체계만 지원되며, 다른 GA4 이벤트는 버려집니다. 레거시 `wcs.cnv` API는
  의도적으로 사용하지 않습니다.
- `consentRequired: true`로 설정하면 `setConsent`를 통해 `ad_storage`가 허용될 때까지 이벤트를
  버립니다. 기본값은 게이팅 없음(플랫폼 위임)입니다.
