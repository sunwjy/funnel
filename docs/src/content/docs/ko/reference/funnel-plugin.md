---
title: FunnelPlugin
description: 모든 플러그인이 구현하는 인터페이스 — name, initialize, track, 그리고 선택적 훅.
sidebar:
  order: 3
---

`FunnelPlugin`은 모든 플러그인이 구현하는 계약입니다. 각 분석 플랫폼(GA4, Meta Pixel 등)은 이
인터페이스를 만족하는 객체를 제공하며 [`Funnel`](/ko/reference/funnel/) 인스턴스에
등록됩니다. 이 인터페이스를 직접 구현해야 하는 경우는 **커스텀** 플러그인을 작성할 때뿐입니다
— 내장된 `createXxxPlugin()` 팩토리는 이미 이를 만족하는 객체를 반환합니다.

```ts
import type { FunnelPlugin } from "@sunwjy/funnel-core";
// "@sunwjy/funnel-client"에서도 다시 내보냄
```

## 인터페이스

| 멤버 | 시그니처 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | `string` | 예 | 고유한 플러그인 이름. `initialize`에서 플러그인별 설정의 키로도 사용. |
| `initialize` | `(config: Record<string, unknown>) => void` | 예 | 설정 객체로 플러그인을 초기화. |
| `track` | `<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) => void` | 예 | 하나의 이벤트를 추적. |
| `setUser` | `(properties: UserProperties) => void` | 선택 | 플러그인의 사용자 정체성을 설정. |
| `resetUser` | `() => void` | 선택 | 사용자 정체성을 지움(로그아웃). |
| `setConsent` | `(state: ConsentState) => void` | 선택 | 누적된 동의 상태를 적용. |

### `name`

고유 문자열입니다. `Funnel` 디스패처는 이를 사용해
[`initialize(pluginConfigs)`](/ko/reference/funnel/#initializepluginconfigs)에서 이
플러그인의 설정을 조회합니다 — `pluginConfigs[name]`의 값이 여러분의 `initialize`로
전달됩니다.

### `initialize(config)`

```ts
initialize(config: Record<string, unknown>): void
```

`Funnel.initialize()`가 플러그인마다 한 번씩 호출합니다. `config`는 여러분의 `name`을 키로 한
객체(없으면 `{}`)입니다. 여기서 ID를 읽고 플랫폼 전역 객체를 설정합니다.

### `track(eventName, params, context)`

```ts
track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void
```

모든 이벤트마다 호출됩니다. `eventName`은 [`EventMap`](/ko/reference/event-map/)의 키이고,
`params`는 해당 이벤트의 파라미터 타입과 일치하며, `context`는 공유 `eventId`를 담은
[`EventContext`](/ko/reference/event-context/)입니다. 여기서 GA4 형태의 입력을 플랫폼
네이티브 호출로 매핑하세요.

### `setUser(properties)` — 선택

```ts
setUser?(properties: UserProperties): void
```

선택입니다. [`UserProperties`](/ko/reference/funnel/#setuserproperties)(GA4 사용자 모델)를
받습니다. 사용자 식별이 없는 플랫폼의 플러그인(예: Kakao Pixel, Naver Ad)은 이를
생략해야 합니다.

### `resetUser()` — 선택

```ts
resetUser?(): void
```

선택입니다. 로그아웃 시 저장된 사용자 상태를 초기화합니다.

### `setConsent(state)` — 선택

```ts
setConsent?(state: ConsentState): void
```

선택입니다. 누적된 전체 [`ConsentState`](/ko/reference/funnel/#setconsentstate)(Google
Consent Mode v2 신호)를 받습니다. 신호를 플랫폼의 네이티브 동의 API로 매핑하거나, 플랫폼에
해당 기능이 없으면 이벤트 디스패치를 차단하세요.

## 직접 플러그인 작성하기

최소한의 플러그인은 `name`, `initialize`, `track`만 있으면 됩니다. 선택적 훅은 플랫폼이
지원할 때 추가하면 됩니다.

```ts
import type { FunnelPlugin } from "@sunwjy/funnel-core";

export function createConsolePlugin(): FunnelPlugin {
  return {
    name: "console",

    initialize(config) {
      // 여기서 ID를 읽고 플랫폼 전역 객체를 설정합니다.
      console.log("[console-plugin] initialized with", config);
    },

    track(eventName, params, context) {
      // GA4 이벤트를 플랫폼의 네이티브 호출로 매핑합니다.
      // 공유된 eventId가 서버사이드 중복 제거를 가능하게 합니다.
      console.log("[console-plugin]", eventName, params, context.eventId);
    },

    // 선택적 훅 — 플랫폼이 지원하는 것만 포함하세요.
    setUser(properties) {
      console.log("[console-plugin] setUser", properties);
    },
    resetUser() {
      console.log("[console-plugin] resetUser");
    },
    setConsent(state) {
      console.log("[console-plugin] setConsent", state);
    },
  };
}
```

내장 플러그인과 동일하게 등록합니다:

```ts
import { Funnel } from "@sunwjy/funnel-client";

const funnel = new Funnel({ plugins: [createConsolePlugin()] });
funnel.initialize({ console: { label: "demo" } });
funnel.track("page_view", { page_title: "Home" });
```

## 함께 보기

- [`Funnel`](/ko/reference/funnel/) — 이 메서드들을 구동하는 디스패처.
- [`EventMap`](/ko/reference/event-map/) — 여러분의 `track`이 받는 이벤트.
- [`EventContext`](/ko/reference/event-context/) — `track`에 전달되는 `eventId`.
