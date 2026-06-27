---
title: Mixpanel
description: window.mixpanel을 통해 Funnel의 GA4 이벤트를 Mixpanel로 전송합니다.
sidebar:
  order: 12
---

Mixpanel 플러그인은 Funnel을 **Mixpanel** 프로덕트 분석에 연결합니다. Funnel의 GA4 표준 이벤트를
`window.mixpanel`을 통해 Mixpanel로 전달하며, 각 이벤트 이름을 Title Case로 변환합니다
(`add_to_cart` → `Add To Cart`).

## 무엇을 추적하나요

모든 Funnel 이벤트가 Title Case 이름으로 전달됩니다:

| Funnel 이벤트 (GA4) | Mixpanel 이벤트 |
| --- | --- |
| `page_view` | `Page View` |
| `view_item` | `View Item` |
| `add_to_cart` | `Add To Cart` |
| `purchase` | `Purchase` |
| …그 외 모든 이벤트 | GA4 이름의 Title Case |

이벤트 파라미터는 그대로 전달되며, `items` 배열은 Mixpanel에 적합한 속성으로 평탄화됩니다. 각
이벤트는 Funnel의 `eventId`로 `$insert_id`를 설정하므로 중복 전송이 서버사이드에서 제거됩니다.

## 시작하기 전에

- **Mixpanel 프로젝트 토큰**.
- 페이지에 로드된 Mixpanel 기본 스니펫. Funnel이 실행되기 전에 `window.mixpanel`이 존재해야
  합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMixpanelPlugin } from "@sunwjy/funnel-client/mixpanel";

export const funnel = new Funnel({
  plugins: [createMixpanelPlugin()],
  debug: true,
});

funnel.initialize({
  mixpanel: {
    token: "your_project_token",
    // mixpanel.init(token, config)로 전달 (선택 사항)
    config: { api_host: "https://api-eu.mixpanel.com" },
  },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로
`analytics_storage`를 허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 99,
  transaction_id: "T-3003",
});
```

이 호출은 `mixpanel.track("Purchase", { currency: "USD", value: 99, transaction_id: "T-3003", $insert_id: "..." })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- Mixpanel에 `config: { debug: true }`를 전달하면 Mixpanel 자체 콘솔 출력을 볼 수 있습니다.
- Mixpanel 대시보드의 **Events**를 확인하거나 실시간 이벤트는 **Live View**를 사용하세요.

## 참고

- **SSR 안전.** `window`(또는 `window.mixpanel`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- `funnel.setUser(...)`는 `mixpanel.identify(user_id)`와 `mixpanel.people.set(...)`을 호출하며,
  `email`/`phone_number`/`first_name`/`last_name`을 Mixpanel의 `$email`/`$phone`/
  `$first_name`/`$last_name`으로 매핑합니다. 그 외 속성은 그대로 전달됩니다.
- `funnel.resetUser()`는 `mixpanel.reset()`을 호출합니다(로그아웃).
- EU 데이터 레지던시는 `config.api_host`(`https://api-eu.mixpanel.com`)를 사용하세요.
