---
title: 빠른 시작 (5분)
description: GA4와 Meta Pixel을 연결하고 첫 이벤트를 보냅니다.
sidebar:
  order: 3
---

이 워크스루는 두 플러그인 — **GA4**와 **Meta Pixel** — 을 연결하고 이벤트 몇 개를 보냅니다.
[`@sunwjy/funnel-client`를 이미 설치](/ko/start-here/installation/)했다고 가정합니다.

## 1. 플랫폼 기본 스니펫 로드

Funnel은 `window.gtag`와 `window.fbq`를 호출하므로 해당 전역 객체가 먼저 존재해야 합니다.
GA4와 Meta Pixel의 표준 기본 스니펫(각 대시보드에서 제공하는 코드)을 페이지 `<head>`에
추가하세요. 로드만 해 두면 이벤트 호출은 Funnel이 처리합니다.

## 2. 플러그인과 함께 Funnel 생성

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: true, // 연결하는 동안 각 디스패치를 콘솔에 출력
});
```

## 3. ID로 초기화

각 플러그인 설정을 플러그인 이름을 키로 전달합니다. 여기서 준 런타임 설정이 팩토리에 전달한
값보다 우선합니다.

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

## 4. 이벤트 추적

GA4 이벤트 이름과 파라미터로 `track()`을 호출합니다. 같은 호출이 **모든** 플러그인에 도달합니다.

```ts
// 페이지 조회
funnel.track("page_view", { page_title: "Home" });

// 구매 — GA4 표준 파라미터
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
});
```

끝입니다. `debug: true`면 각 이벤트가 로그로 보이고, GA4와 Meta Pixel 모두 자기 플랫폼
형식으로 이벤트를 받습니다.

:::tip[initialize 전 이벤트]
`initialize()` 전에 `track()`을 호출해도 됩니다 — 이벤트는 큐에 쌓였다가(최대 100개)
초기화가 끝나면 순서대로 재생되며, 각자 원래 `eventId`를 유지합니다.
:::

## 다음으로

- [핵심 개념](/ko/guides/) — `Funnel`, 플러그인, `EventContext`가 어떻게 맞물리는지
- [플러그인 카탈로그](/ko/plugins/) — TikTok, Kakao, LinkedIn 등 추가
- [서버사이드 & 중복 제거](/ko/guides/) — Meta Pixel과 Conversions API 짝짓기
