---
title: 설치
description: 패키지 매니저로 Funnel을 설치합니다.
sidebar:
  order: 2
---

Funnel은 두 개의 패키지로 제공됩니다. 대부분의 앱은 **`@sunwjy/funnel-client`** 하나면
충분합니다. 이 패키지가 코어의 모든 것을 재수출하므로, 한 번 설치로 `Funnel` 클래스, 모든 이벤트
타입, 모든 클라이언트 플러그인을 얻습니다.

```bash
# pnpm
pnpm add @sunwjy/funnel-client

# npm
npm install @sunwjy/funnel-client

# yarn
yarn add @sunwjy/funnel-client
```

## 어떤 패키지가 필요한가요?

| 패키지 | 사용 시점 |
| --- | --- |
| `@sunwjy/funnel-client` | 브라우저 앱. `Funnel` 클래스(코어 재수출) **와** 모든 클라이언트 플러그인 포함. 여기서 시작하세요. |
| `@sunwjy/funnel-core` | 공유 타입과 디스패처만. 서버 코드나 클라이언트 번들을 끌어오면 안 되는 커스텀 플러그인에 유용합니다. |

## 두 가지 import 방식

```ts
// 배럴 import — 편리하고 완전히 트리쉐이킹됨 (sideEffects: false)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// 서브패스 import — 명시한 플러그인만 번들에 포함됨을 보장
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
```

둘 다 트리쉐이킹됩니다. 원하는 방식을 쓰면 되고, 서브패스 형태는 플러그인별 의존을 명시적으로
드러냅니다.

## 플랫폼 SDK 로드

Funnel은 분석 전역 객체(`window.gtag`, `window.fbq` 등)를 호출하지만 직접 로드하지는
**않습니다.** 해당 플러그인을 초기화하기 전에 각 플랫폼의 기본 스니펫을 평소처럼 사이트에
추가하세요. 각 플러그인이 필요로 하는 전역 객체는 [플러그인 페이지](/ko/plugins/)에 정확히
나와 있습니다.

## 다음 단계

준비됐습니다 — [5분 만에 첫 이벤트를 보내보세요](/ko/start-here/quickstart/).
