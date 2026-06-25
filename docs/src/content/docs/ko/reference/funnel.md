---
title: Funnel
description: 디스패처 클래스 — 플러그인 설정, 초기화, 이벤트 추적.
sidebar:
  order: 2
---

`Funnel`은 라이브러리의 중심에 있는 디스패처입니다. 인스턴스 하나를 만들고, 플러그인을
등록하고, ID로 초기화한 뒤 `track()`을 호출합니다. 모든 `track()` 호출은 등록된 **모든**
플러그인으로 퍼지며, 각 플러그인의 실패는 격리되어 망가진 플러그인 하나가 나머지를 막지
않습니다.

```ts
import { Funnel } from "@sunwjy/funnel-client";
// 또는: import { Funnel } from "@sunwjy/funnel-core";
```

`@sunwjy/funnel-client`와 `@sunwjy/funnel-core` 모두 `Funnel`을 내보냅니다. 클라이언트
패키지는 편의를 위해 이를 다시 내보내므로 한곳에서 모든 것을 임포트할 수 있습니다.

## `FunnelConfig`

`new Funnel(config)`에 전달하는 객체입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `plugins` | `FunnelPlugin[]` | 예 | 등록할 플러그인 목록. |
| `debug` | `boolean` | 아니요 | `true`면 디버그 로그를 콘솔에 출력. 기본값은 `false`. |
| `onError` | `(error: unknown, context: FunnelErrorContext) => void` | 아니요 | 플러그인이 라이프사이클 메서드에서 예외를 던질 때 호출. 기본 `console.error`를 대체. |

### `FunnelErrorContext`

`onError`의 두 번째 인자로 전달되어 어떤 플러그인과 라이프사이클 단계가 실패했는지 알 수
있습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `plugin` | `string` | 오류가 발생한 플러그인 이름. |
| `phase` | `"initialize" \| "track" \| "setUser" \| "resetUser" \| "setConsent"` | 예외를 던진 라이프사이클 메서드. |
| `eventName` | `EventName`(선택) | 이벤트 이름. `phase === "track"`일 때만 존재. |

오류는 항상 격리됩니다 — 플러그인 하나가 예외를 던져도 나머지는 막히지 않습니다. `onError`를
제공하면 그 오류를 로그 대신 다른 곳(Sentry, Bugsnag 등)으로 전달할 수 있습니다.

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import * as Sentry from "@sentry/browser";

const funnel = new Funnel({
  plugins: [createGA4Plugin()],
  debug: true,
  onError(error, context) {
    Sentry.captureException(error, { extra: { ...context } });
  },
});
```

## `new Funnel(config)`

새 인스턴스를 생성합니다. 생성자는 설정만 저장하며 — [`initialize()`](#initializepluginconfigs)를
호출하기 전까지는 어떤 플러그인도 건드리지 않습니다.

```ts
const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});
```

## `initialize(pluginConfigs?)`

```ts
initialize(pluginConfigs?: Record<string, Record<string, unknown>>): void
```

등록된 모든 플러그인을 초기화합니다. `pluginConfigs`는 **플러그인 이름**(`plugin.name`)을
키로 하는 맵이며 — 각 키의 값이 해당 플러그인의 `initialize()`에 전달됩니다. 항목이 없는
플러그인은 빈 객체(`{}`)를 받습니다.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

핵심 동작:

- **플러그인별 멱등성.** 이미 초기화된 플러그인은 이후 호출에서 건너뜁니다. 덕분에
  HMR/개발 리로드 중 반복 호출이 안전합니다.
- **초기화 후 효과 순서.** [`setConsent`](#setconsentstate)로 저장된 동의가 먼저 적용되고,
  그다음 [`setUser`](#setuserproperties)로 저장된 사용자 정체성이 적용되며, 마지막으로
  초기화 이전 이벤트 큐가 재생됩니다([`track`](#trackeventname-params) 참고).

## `track(eventName, params)`

```ts
track<E extends EventName>(eventName: E, params: EventMap[E]): void
```

하나의 이벤트를 등록된 모든 플러그인으로 보냅니다. `eventName`은
[`EventMap`](/ko/reference/event-map/)의 키여야 하며 `params`는 해당 이벤트의 파라미터
타입에 대해 검사됩니다.

매 호출마다 고유한 `eventId`를 담은 새 [`EventContext`](/ko/reference/event-context/)가
생성되어 모든 플러그인에 전달되므로, 모든 플랫폼이 동일한 이벤트 정체성을 보게 됩니다.

```ts
funnel.track("page_view", { page_title: "Home" });

funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
});
```

### `initialize` 전 큐잉

`initialize()` 전에 `track()`을 호출할 수 있습니다. 그런 이벤트는 초기화가 끝나면 순서대로
**큐에 쌓였다가 재생**됩니다:

- 큐는 최대 **100개**의 이벤트를 담습니다. 그 이상이면 새 이벤트는 콘솔 경고와 함께
  버려집니다.
- `eventId`는 **호출 시점**에 생성되므로, 큐에 쌓인 이벤트는 나중에 재생될 때 원래 정체성을
  유지합니다.

## `setUser(properties)`

```ts
setUser(properties: UserProperties): void
```

`setUser`를 구현한 모든 플러그인에 사용자 정체성과 속성을 설정합니다. GA4 사용자 속성 모델을
정규 형식으로 사용합니다. `initialize()` 전에 호출하면 속성이 저장되었다가 초기화 중 각
플러그인에 적용됩니다(큐의 이벤트가 재생되기 전에).

`UserProperties` 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `user_id` | `string`(선택) | 안정적인 크로스 디바이스 사용자 식별자(GA4 `user_id`). |
| `email` | `string`(선택) | 이메일 주소. Meta, TikTok, X, Google Ads의 고급 매칭에 사용. |
| `phone_number` | `string`(선택) | E.164 형식 전화번호. 고급 매칭에 사용. |
| `first_name` | `string`(선택) | 이름. Meta 고급 매칭과 Google 향상된 전환에 사용. |
| `last_name` | `string`(선택) | 성. Meta 고급 매칭과 Google 향상된 전환에 사용. |
| `[key: string]` | `unknown` | 임의의 커스텀 사용자 속성. |

```ts
funnel.setUser({ user_id: "u-123", email: "user@example.com" });
```

## `resetUser()`

```ts
resetUser(): void
```

모든 플러그인에서 사용자 정체성을 지웁니다(로그아웃 시나리오). 저장된 사용자 속성을 지우고
`resetUser()`를 구현한 각 플러그인의 메서드를 호출합니다.

```ts
funnel.resetUser();
```

## `setConsent(state)`

```ts
setConsent(state: ConsentState): void
```

`setConsent`를 구현한 모든 플러그인에서 사용자 동의 상태를 갱신합니다. **부분** 업데이트를
허용합니다 — 주어진 신호가 마지막으로 알려진 상태에 병합되고, 누적된 전체 `ConsentState`가
각 플러그인으로 전달됩니다. `initialize()` 전에 호출하면 상태가 저장되었다가 초기화 중 —
사용자 정체성과 큐 이벤트보다 먼저 — 적용됩니다.

`ConsentState`는 Google Consent Mode v2 신호 모델을 따릅니다. 각 필드는 `ConsentStatus`
(`"granted" | "denied"`)이며 모든 필드는 선택입니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `ad_storage` | `ConsentStatus`(선택) | 광고 목적의 쿠키/식별자. |
| `analytics_storage` | `ConsentStatus`(선택) | 분석 목적의 쿠키/식별자. |
| `ad_user_data` | `ConsentStatus`(선택) | 광고를 위해 Google로 사용자 데이터 전송(Consent Mode v2). |
| `ad_personalization` | `ConsentStatus`(선택) | 개인 맞춤 광고(Consent Mode v2). |

```ts
funnel.setConsent({ analytics_storage: "granted" });
// 나중에 — 이전 상태에 병합됨
funnel.setConsent({ ad_storage: "granted", ad_user_data: "granted" });
```

## 함께 보기

- [`EventMap`](/ko/reference/event-map/) — `track()`이 받는 이벤트 이름과 파라미터.
- [`FunnelPlugin`](/ko/reference/funnel-plugin/) — 등록된 각 플러그인이 구현하는 인터페이스.
- [`EventContext`](/ko/reference/event-context/) — 매 `track()`마다 생성되는 이벤트별
  컨텍스트.
