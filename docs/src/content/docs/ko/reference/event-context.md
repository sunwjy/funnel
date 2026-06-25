---
title: EventContext
description: 중복 제거에 사용되는 공유 eventId를 담은 이벤트별 컨텍스트.
sidebar:
  order: 4
---

`EventContext`는 [`Funnel`](/ko/reference/funnel/) 디스패처가 **매**
[`track()`](/ko/reference/funnel/#trackeventname-params) 호출마다 생성해 각 플러그인의
[`track()`](/ko/reference/funnel-plugin/#trackeventname-params-context)에 전달하는 작은
메타데이터 객체입니다. GA4 이벤트 스키마에는 포함되지 _않지만_ 크로스 플랫폼 기능(주로
서버사이드 중복 제거)에 필요한 데이터를 담습니다.

```ts
import type { EventContext } from "@sunwjy/funnel-core";
```

## 구조

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `eventId` | `string` | 이 이벤트의 고유 식별자. 중복 제거에 사용(예: Meta CAPI). |

## `track()`당 하나의 eventId, 모든 플러그인이 공유

하나의 `track()` 호출에 대해 디스패처는 `eventId` **하나**를 생성하고 동일한 `context` 객체를
등록된 모든 플러그인에 넘깁니다. 따라서 GA4, Meta Pixel, 그 밖의 모든 플러그인이 그 이벤트에
대해 동일한 `eventId`를 봅니다.

이것이 중복 제거의 핵심입니다. 같은 이벤트가 두 채널로 보고될 때, 예를 들어 브라우저의
Meta Pixel **과** 서버의 Meta Conversions API(CAPI)로 보고되더라도, 두 보고가 같은
`eventId`를 담을 수 있고 Meta는 이를 두 번이 아니라 한 번으로 집계합니다.

```ts
// 플러그인 내부에서 eventId는 context로 제공됩니다:
track(eventName, params, context) {
  fbq("track", "Purchase", { value: params.value }, { eventID: context.eventId });
}
```

## `eventId` 생성 방식

디스패처는 `crypto.randomUUID()`가 사용 가능하면(최신 브라우저와 Node) 이를 사용하고, 없는
환경에서는 `Math.random()`으로 만든 UUID v4 형태의 문자열로 폴백합니다. 어느 쪽이든 고유한
UUID 형태의 문자열을 얻습니다.

`eventId`는 **호출 시점**에 생성됩니다. 따라서 `initialize()` 전에 `track()`을 호출하면
이벤트는 큐에 쌓였다가 나중에 **원래** `eventId`를 그대로 유지한 채 재생됩니다. 정체성은
디스패치 시점이 아니라 `track`을 호출할 때 고정됩니다.
[initialize 전 큐잉](/ko/reference/funnel/#initialize-전-큐잉)을 참고하세요.

## 서버사이드 중복 제거 구동

브라우저에서 픽셀을 실행하고 그 서버사이드 대응물을 함께 운영할 때의 일반적인 흐름:

1. 브라우저가 `funnel.track("purchase", { ... })`를 호출합니다. 디스패처가 `eventId` 하나를
   생성합니다.
2. 브라우저 측 플러그인(예: Meta Pixel)이 그 `eventId`로 이벤트를 보냅니다.
3. 같은 논리적 이벤트를 플랫폼의 서버 API(예: Meta CAPI)로 **같은 `eventId`와 함께**
   전달합니다.
4. 플랫폼은 같은 ID를 공유하는 한 이벤트의 두 보고를 보고 중복을 제거합니다.

3단계를 가능하게 하려면 `eventId`를 서버에 노출하세요(예: 브라우저가 백엔드도 호출할 때 요청
본문에 포함). 이 공유 식별자가 두 보고를 연결합니다.

## 함께 보기

- [`Funnel`](/ko/reference/funnel/): 매 `track()`마다 `EventContext`를 생성.
- [`FunnelPlugin`](/ko/reference/funnel-plugin/): `track`의 세 번째 인자로 `context`를 받음.
- [`EventMap`](/ko/reference/event-map/): `purchase.transaction_id`는 많은 플랫폼이 구매
  중복 제거에도 사용하는 GA4 수준의 ID라는 점에 유의.
