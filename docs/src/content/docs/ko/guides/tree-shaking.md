---
title: 트리쉐이킹 & import
description: 배럴 vs 서브패스 import, sideEffects, 그리고 번들을 최소로 유지하는 법.
sidebar:
  order: 7
---

Funnel은 여러 플랫폼용 어댑터를 제공하지만, 실제로 쓰는 것만 비용을 치릅니다. 올바른 import를
쓰면 번들러가 포함하지 않은 모든 플러그인을 떨어냅니다. 이 페이지는 번들을 작게 유지하는 법을
설명합니다.

## 두 가지 import 방식

유효한 import 방식은 두 가지이며, 둘 다 트리쉐이킹이 됩니다:

```ts
// 1. 배럴 import — 패키지 루트에서 전부.
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// 2. 서브패스 import — 각 플러그인을 자기 진입점에서.
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
```

둘은 동일한 런타임 동작을 만듭니다. 차이는 번들러가 얼마나 적극적으로 미사용 코드를 잘라낼 수
있느냐입니다.

## `sideEffects: false`가 배럴을 안전하게 만든다

`@sunwjy/funnel-client`는 `package.json`에 `"sideEffects": false`를 선언합니다. 이는
번들러(webpack, Rollup, esbuild, Vite 등)에게 모듈을 import해도 부수 효과가 없음을 알려주므로,
실제로 쓰지 않는 export는 안전하게 제거될 수 있습니다.

즉 **배럴 import**도 트리쉐이킹됩니다: 루트에서 `createGA4Plugin`을 import해도, TikTok, Kakao,
LinkedIn 플러그인을 한 번도 참조하지 않는다면 그것들을 끌어오지 않습니다.

```ts
// 배럴이 전부를 노출해도, 번들에는 Funnel + GA4만 들어갑니다.
import { Funnel, createGA4Plugin } from "@sunwjy/funnel-client";

export const funnel = new Funnel({ plugins: [createGA4Plugin()] });
```

## 서브패스 import: 보장된 격리

서브패스 import는 한 걸음 더 나아갑니다 — 번들러를 단일 플러그인의 진입점으로 직접 가리키므로,
번들러의 트리쉐이킹이 불완전하거나 꺼져 있어도 형제 플러그인을 끌어올 여지가 없습니다:

```ts
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
```

모든 플러그인은 자기 서브패스를 가집니다. 사용 가능한 서브패스는 다음과 같습니다:

`ga4`, `gtm`, `sgtm`, `meta-pixel`, `meta-conversion-api`, `google-ads`, `tiktok-pixel`,
`kakao-pixel`, `naver-ad`, `x-pixel`, `linkedin-insight`, `mixpanel`, `amplitude`, `toss-ads`,
`reddit-pixel`, `daangn-ads`, `pinterest-tag`.

`@sunwjy/funnel-client/<subpath>` 형태로 사용하세요.

## 어떤 걸 써야 하나?

- **배럴 import** — 편리하고, import 줄이 적으며, `sideEffects: false` 덕분에 올바르게
  트리쉐이킹됩니다. 모던 번들러를 쓰는 대부분의 앱에 좋은 기본값입니다.
- **서브패스 import** — 보장을 원하거나, 트리쉐이킹을 전적으로 신뢰하기 어려운 툴체인을 다룰 때
  가장 안전한 선택입니다. 약간 더 장황합니다.

어느 쪽이든 규칙은 같습니다: **실제로 등록하는 플러그인만 import하라.** 무게를 더하는 유일한
요소는 사용하지 않는 `createXPlugin` import뿐입니다.

:::tip[번들을 검증하세요]
최적화 중이라면, 번들러 분석기(예: `rollup-plugin-visualizer`, `vite-bundle-visualizer`,
`webpack-bundle-analyzer`)를 실행해 사용하는 플러그인만 나타나는지 확인하세요. import한 적 없는
플랫폼이 보이면 안 됩니다.
:::

## 다음으로

- [여러 플러그인 연결](/ko/guides/multiple-plugins/) — import가 함께 어우러지는 방식.
- [핵심 개념](/ko/guides/core-concepts/) — 각 플러그인이 실제로 하는 일.
