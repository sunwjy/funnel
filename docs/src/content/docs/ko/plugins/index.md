---
title: 플러그인
description: 분석 플랫폼별 카탈로그 페이지.
sidebar:
  order: 0
---

각 플러그인은 Funnel의 GA4 표준 이벤트를 한 플랫폼의 네이티브 형식으로 매핑합니다. 필요한 만큼
연결하세요 — [`track()`](/ko/start-here/quickstart/) 한 번이 모두에 도달합니다.

모든 플러그인 페이지는 같은 형식을 따릅니다: 무엇을 추적하는지, 무엇을 준비해야 하는지(ID, 기본
스니펫), 설치·초기화 방법, 연결 코드, 검증 방법, 그리고 주의사항(예: SSR).

```ts
// 쓰는 것만 import — 모든 플러그인은 named 팩토리입니다.
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createTikTokPixelPlugin } from "@sunwjy/funnel-client/tiktok-pixel";
```

카탈로그는 GA4, Google Tag Manager, 서버사이드 GTM, Meta Pixel과 Conversions API, Google
Ads, TikTok, Kakao, Naver, X, LinkedIn, Mixpanel, Amplitude, Toss Ads, Reddit, Daangn,
Pinterest를 다룹니다. 개별 페이지는 사이드바에 나열됩니다.
