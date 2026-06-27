# Funnel

[![CI](https://github.com/sunwjy/funnel/actions/workflows/ci.yml/badge.svg)](https://github.com/sunwjy/funnel/actions/workflows/ci.yml)
[![npm: funnel-client](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-client?label=funnel-client)](https://www.npmjs.com/package/@sunwjy/funnel-client)
[![npm: funnel-core](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-core?label=funnel-core)](https://www.npmjs.com/package/@sunwjy/funnel-core)
[![bundle size](https://deno.bundlejs.com/badge?q=%40sunwjy%2Ffunnel-client)](https://bundlejs.com/?q=%40sunwjy%2Ffunnel-client)
[![license](https://img.shields.io/npm/l/%40sunwjy%2Ffunnel-client)](./LICENSE)

[English](./README.md) | 한국어

핵심 마케팅 퍼널 이벤트를 단일 인터페이스로 연결된 모든 분석 도구에 전송하는 라이브러리입니다.
이벤트는 GA4 표준을 따르고, 각 플러그인이 이를 대상 도구의 네이티브 포맷으로 변환합니다. `track()`
한 번이면 GA4, Meta, TikTok 등으로 전송됩니다.

## 패키지

| 패키지 | 설명 |
|---------|-------------|
| `@sunwjy/funnel-core` | 이벤트 타입, 플러그인 인터페이스, `Funnel` 클래스, `EventContext`(자동 생성 `eventId`) |
| `@sunwjy/funnel-client` | 모든 클라이언트 사이드 플러그인(17개 플랫폼) + 코어 전체 재수출 |

## 설치

```bash
npm install @sunwjy/funnel-client
# 또는: pnpm add @sunwjy/funnel-client
# 또는: yarn add @sunwjy/funnel-client
```

이것만 설치하면 됩니다. `@sunwjy/funnel-core`가 `@sunwjy/funnel-client`에서 재수출되므로,
이 한 번의 설치로 `Funnel` 클래스와 모든 이벤트 타입이 함께 제공됩니다.

## 빠른 시작

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});

// 한 번의 호출 → 연결된 모든 플러그인에 각자의 네이티브 포맷으로 전송
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });
```

Funnel은 플랫폼 전역 객체(`window.gtag`, `window.fbq` 등)를 호출하지만 직접 로드하지는 않습니다.
각 플랫폼의 기본 스니펫을 평소처럼 추가하세요. 전체 과정은
[5분 빠른 시작](./docs/src/content/docs/ko/start-here/quickstart.md)을 참고하세요.

## 문서

입문용 전체 문서(영어 + 한국어)는 [`docs/`](./docs)에 있으며, 배포되면
**https://funnel-docs.netlify.app** 에 게시됩니다.

- **시작하기**: [Funnel이란?](./docs/src/content/docs/ko/start-here/what-is-funnel.md) ·
  [설치](./docs/src/content/docs/ko/start-here/installation.md) ·
  [빠른 시작](./docs/src/content/docs/ko/start-here/quickstart.md)
- **가이드**: [핵심 개념, 프레임워크 연동, 서버사이드 중복 제거, SSR, 트리쉐이킹](./docs/src/content/docs/ko/guides/)
- **플러그인**: [17개 플랫폼 전체 설정 페이지](./docs/src/content/docs/ko/plugins/)
- **레퍼런스**: [EventMap, Funnel, FunnelPlugin, EventContext](./docs/src/content/docs/ko/reference/)

English documentation is under [`docs/src/content/docs/`](./docs/src/content/docs/).

## 예제

세 개의 독립 예제가 [`examples/*`](./examples)에 있습니다. 각 예제는 `workspace:*`로 라이브러리를
참조하는 pnpm 워크스페이스 패키지라 항상 현재 소스를 반영합니다.

| 경로 | 스택 | 실행 |
|------|-------|-----|
| `examples/vanilla-html` | Vite + 바닐라 TS | `pnpm --filter @repo/example-vanilla-html dev` |
| `examples/react-vite` | React 19 + Vite | `pnpm --filter @repo/example-react-vite dev` |
| `examples/nextjs` | Next.js 15 App Router | `pnpm --filter @repo/example-nextjs dev` |

기본적으로 모든 예제는 플레이스홀더 / 로그 데모 모드로 실행됩니다. 실제 플랫폼 ID가 필요 없습니다.

## 개발

```bash
pnpm install     # 의존성 설치
pnpm build       # 전체 패키지 빌드
pnpm typecheck   # 타입 체크
pnpm lint        # 린트
pnpm test        # 테스트
```

## 기술 스택

- **모노레포**: pnpm + Turborepo
- **번들러**: tsdown (ESM + CJS 듀얼 빌드, `.d.ts` 생성)
- **문서**: Astro Starlight (이중 언어, Netlify 배포)
- **린트/포맷**: Biome
- **TypeScript**: strict 모드, `verbatimModuleSyntax`
