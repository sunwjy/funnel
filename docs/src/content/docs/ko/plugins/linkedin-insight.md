---
title: LinkedIn Insight Tag
description: window.lintrk를 통해 Funnel의 GA4 이벤트를 LinkedIn 전환으로 전송합니다.
sidebar:
  order: 11
---

LinkedIn Insight Tag 플러그인은 Funnel을 **LinkedIn 광고**에 연결합니다. Funnel의 GA4 표준
이벤트를 LinkedIn 전환으로 매핑하고 `window.lintrk`를 통해 전송합니다. LinkedIn은 전환을 숫자형
**전환 ID(conversion ID)**로 식별하므로, 추적하려는 각 GA4 이벤트를 플러그인 설정에서 전환 ID와
매핑해야 합니다.

## 무엇을 추적하나요

LinkedIn에는 이름이 정해진 표준 이벤트가 없습니다. 전환 ID를 사용합니다. GA4 이벤트 이름에서
LinkedIn 전환 ID로 가는 `conversionIds` 맵을 제공하세요:

| Funnel 이벤트 (GA4) | LinkedIn |
| --- | --- |
| `page_view` | Insight Tag가 자동 추적 (Funnel은 건너뜀) |
| 매핑된 모든 이벤트 | `lintrk("track", { conversion_id })` |
| 매핑되지 않은 이벤트 | 드롭됨 (`debug: true`일 때 선택적으로 로그) |

이벤트에 `value`와 `currency`가 모두 있으면 Funnel은 수익 객체
`{ value: { currency, amount } }`를 전송합니다.

## 시작하기 전에

- Campaign Manager에서 발급받은 **LinkedIn Partner ID**.
- Campaign Manager → 전환(Conversions)에서 생성한 하나 이상의 **전환 ID**.
- 페이지에 로드된 LinkedIn Insight Tag 기본 스니펫. Funnel이 실행되기 전에 `window.lintrk`가
  존재해야 합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createLinkedInInsightPlugin } from "@sunwjy/funnel-client/linkedin-insight";

export const funnel = new Funnel({
  plugins: [createLinkedInInsightPlugin()],
  debug: true,
});

funnel.initialize({
  "linkedin-insight": {
    partnerId: "1234567",
    conversionIds: {
      sign_up: 9876543,
      purchase: 9876544,
    },
    debug: false, // 매핑되지 않은 비 page_view 이벤트에 경고
  },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 120,
  transaction_id: "T-2002",
});
```

위 매핑 기준으로 이 호출은 `lintrk("track", { conversion_id: 9876544, value: { currency: "USD", amount: 120 } })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- **LinkedIn Insight Tag** 브라우저 확장 프로그램으로 태그가 발생하는지 확인하세요.
- LinkedIn Campaign Manager에서 전환 수를 확인하세요(처리에 시간이 걸릴 수 있습니다).

## 참고

- **SSR 안전.** `window`(또는 `window.lintrk`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- `page_view`는 의도적으로 전송되지 않습니다. Insight Tag가 페이지뷰를 자체적으로 기록합니다.
- `conversionIds`에 매칭되는 항목이 없는 이벤트는 드롭됩니다. 연결 작업 중에는 플러그인의
  `debug: true`를 설정하면 드롭된 이벤트마다 `console.warn`을 받을 수 있습니다.
