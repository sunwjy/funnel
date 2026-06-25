---
title: 핵심 개념
description: Funnel을 떠받치는 네 가지 개념 — 디스패처, 플러그인, EventContext, 그리고 GA4 스키마.
sidebar:
  order: 1
---

Funnel의 표면적은 작습니다. 네 가지 개념 — **Funnel** 디스패처, **플러그인**, **EventContext**
(그 안의 `eventId`), 그리고 **GA4를 기준(canonical) 스키마로 삼는다는 점** — 만 이해하면 나머지는
자연스럽게 따라옵니다.

## Funnel 디스패처

`Funnel`은 한 번 만들어 어디서나 호출하는 객체입니다. 플러그인 목록을 넘기면, 그 뒤로 단 한 번의
`track()` 호출이 모든 플러그인으로 퍼져 나갑니다(fan-out).

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: true, // 선택: 각 디스패치를 콘솔에 로그
});
```

공개 API는 아주 작습니다:

- `new Funnel({ plugins, debug?, onError? })` — 플러그인 등록.
- `funnel.initialize({ <pluginName>: {<config>} })` — 각 플러그인을 ID로 부팅.
- `funnel.track(eventName, params)` — 이벤트 하나를 모든 플러그인으로 전송.

이외에 선택적 사용자 식별·동의 헬퍼(`setUser`, `resetUser`, `setConsent`)도 있으며, 각각의
가이드에서 다룹니다.

:::tip[initialize 이전의 이벤트]
`initialize()` 전에 `track()`을 호출해도 됩니다. 이벤트는 큐에 쌓였다가(최대 100개), 초기화가
끝나면 순서대로 재생되며 — 각자 원래의 `eventId`를 그대로 유지합니다. 덕분에 설정 로딩과의 경쟁
때문에 첫 페이지뷰를 잃을 일이 없습니다.
:::

## 플러그인

**플러그인**은 분석 플랫폼 하나에 대한 어댑터입니다. 각 플러그인은 GA4 이벤트를 자기 플랫폼의
네이티브 호출(`gtag`, `fbq`, `ttq` 등)로 번역해 전송하는 방법을 알고 있습니다.

개념적으로 플러그인은 `name`과 몇 개의 메서드를 가진 객체일 뿐입니다:

```ts
interface FunnelPlugin {
  name: string; // 예: "ga4", "meta-pixel" — 설정 키로도 쓰임
  initialize(config: Record<string, unknown>): void;
  track(eventName, params, context): void;
  // 선택:
  setUser?(properties): void;
  resetUser?(): void;
  setConsent?(state): void;
}
```

플러그인을 손으로 직접 작성할 일은 드뭅니다 — `createXPlugin()` 팩토리를 import해서 `plugins`
배열에 넣습니다. `name` 문자열이 중요한데, `initialize()`에서 설정을 넘길 때 키로 쓰입니다.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

## EventContext와 eventId

`track()`을 호출할 때마다 Funnel은 작은 **EventContext**를 생성해, 파라미터와 함께 각 플러그인에
전달합니다:

```ts
interface EventContext {
  eventId: string; // track() 호출마다 고유한 UUID
}
```

`eventId`는 한 번의 `track()` 호출 안에서 모든 플러그인에 동일한 값으로 전달됩니다. 이것이 바로
**서버사이드 중복 제거(deduplication)** 를 가능하게 합니다: 브라우저의 Meta Pixel과 서버사이드
Conversions API가 동일한 구매를 보고해도, 두 이벤트가 같은 `eventId`를 공유하므로 Meta는 그것이
하나의 이벤트임을 압니다. 자세한 내용은 [서버사이드 & 중복 제거](/ko/guides/server-side-dedup/)를
보세요.

`eventId`를 직접 만들거나 관리하지 않아도 됩니다 — `initialize()` 전에 큐에 쌓인 이벤트까지
포함해 Funnel이 알아서 처리합니다.

## 디스패치 fan-out과 오류 격리

한 번의 `track()` 호출이 **모든** 플러그인에 도달합니다. 중요한 점은, 플러그인이 **오류 격리**
되어 있다는 것입니다: 한 플러그인이 throw하면 디스패처가 잡아내고 계속 진행하므로, 나머지
플러그인은 여전히 이벤트를 받습니다.

```ts
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });
//   → GA4        수신
//   → Meta Pixel throw? → 로그만 남기고, 막지 않음
//   → TikTok     여전히 수신
```

기본적으로 throw된 오류는 `console.error`로 로그됩니다. 생성자에 `onError`를 넘겨 직접 모니터링으로
보낼 수도 있습니다:

```ts
const funnel = new Funnel({
  plugins: [/* ... */],
  onError: (error, { plugin, phase, eventName }) => {
    myErrorReporter.capture(error, { plugin, phase, eventName });
  },
});
```

커스텀 `onError`를 써도 격리는 그대로 유지됩니다 — 한 플러그인의 실패가 나머지를 막는 일은
없습니다.

## 기준 스키마로서의 GA4

Funnel은 자체 이벤트 어휘를 만들지 않습니다. **GA4가 기준 스키마**입니다: 이벤트 이름과 파라미터를
항상 GA4 규약으로 작성하고, 각 플러그인이 GA4*로부터* 자기 플랫폼*으로* 매핑합니다 — 절대
반대 방향이 아닙니다.

```ts
// GA4 표준을 한 번 작성하면:
funnel.track("add_to_cart", { currency: "KRW", value: 89000, items: [/* ... */] });

// 플러그인들이 번역합니다:
//   → GA4        gtag("event", "add_to_cart", …)
//   → Meta Pixel fbq("track", "AddToCart", …)
//   → TikTok     ttq.track("AddToCart", …)
```

그래서 배워야 할 이름이 하나뿐이며, 동일한 이벤트가 각 플랫폼이 기대하는 형태로 모든 플랫폼에
도달합니다.

## 다음으로

- [첫 이벤트 추적](/ko/guides/first-events/) — 이벤트 이름과 파라미터를 자세히.
- [여러 플러그인 연결](/ko/guides/multiple-plugins/) — 여러 플랫폼을 한 번에 연결.
- [서버사이드 & 중복 제거](/ko/guides/server-side-dedup/) — `eventId`를 활용하기.
