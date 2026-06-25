---
title: Google Ads
description: Funnel의 GA4 이벤트를 window.gtag를 통해 Google Ads 전환으로 변환합니다.
sidebar:
  order: 6
---

Google Ads 플러그인은 Funnel의 GA4 기반 이벤트를 `window.gtag`를 통해 **Google Ads 전환**
이벤트로 변환합니다. 각 GA4 이벤트를 전환 라벨에 매핑하면, 매핑된 이벤트만 전환으로
전달됩니다.

## 무엇을 추적하나요

**전환 라벨**이 설정된 각 GA4 이벤트에 대해 플러그인은
`gtag("event", "conversion", { ...params, event_id, send_to: "<conversionId>/<label>" })`를
실행하며, 원래 GA4 파라미터(items, `transaction_id` 등)를 함께 전달해 Enhanced Conversions가
이를 읽을 수 있게 합니다. 매핑된 라벨이 **없는** 이벤트는 의도적으로 **전달하지 않습니다** —
`send_to`가 없는 `gtag("event", ...)`는 모든 gtag 대상으로 라우팅되어 GA4 플러그인과 함께
이중 집계되기 때문입니다.

## 시작하기 전에

- **Google Ads 전환 ID**(`AW-XXXXXXXXX` 형태).
- 추적하려는 각 액션에 대한 **전환 라벨**(Google Ads 전환 설정에서 발급).
- `window.gtag`가 존재하도록 로드된 gtag.js 기본 스니펫.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGoogleAdsPlugin } from "@sunwjy/funnel-client/google-ads";

export const funnel = new Funnel({
  plugins: [createGoogleAdsPlugin()],
  debug: true,
});

funnel.initialize({
  "google-ads": {
    conversionId: "AW-XXXXXXXXX",
    conversionLabels: {
      purchase: "AbC-D_efG-h12_34-567",
      sign_up: "XyZ-W_vuT-s98_76-543",
    },
  },
});
```

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
});
```

`purchase`에는 라벨이 있으므로 Google Ads 전환이 실행됩니다. 라벨이 없는 이벤트(예:
`view_item`)는 이 플러그인에서 건너뜁니다.

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **Google Tag Assistant**로 올바른 `send_to`와 함께 전환이 실행되는지 확인합니다.
- Google Ads UI의 **전환** 보고서를 확인합니다(어트리뷰션 지연을 감안하세요).

## 참고

- **SSR 안전**: `window` 또는 `window.gtag`가 없으면 모든 메서드가 조기 반환합니다.
- 전환에는 `conversionId`와 일치하는 라벨이 **둘 다** 필요하며, 그렇지 않으면 이벤트가 조용히
  건너뛰어집니다(이중 집계 방지를 위한 설계).
- `setUser`는 Enhanced Conversions를 위해 `email` / `phone_number` / 이름을
  `gtag("set", "user_data", ...)`로 전달합니다. 태그에서 Enhanced Conversions가 활성화되면
  gtag.js가 이를 자동 해시합니다. `resetUser`는 `user_data`를 null로 비웁니다.
- `setConsent`는 Google Consent Mode v2에 1:1로 매핑됩니다.
