---
title: SSR 주의사항
description: 모든 클라이언트 플러그인이 typeof window로 가드하는 이유, 그리고 서버 렌더링 중 Funnel을 안전하게 쓰는 법.
sidebar:
  order: 6
---

Next.js, Remix, Astro 등 서버에서 렌더링하는 프레임워크를 쓴다면 걱정은 늘 같습니다: "이 분석
코드가 `window`를 건드려서 서버 렌더를 터뜨리지 않을까?" Funnel에서는 답이 "아니오"입니다. 이
페이지는 그 이유와, 지켜야 할 단 하나의 규칙을 설명합니다.

## 모든 클라이언트 플러그인은 `typeof window`로 가드합니다

브라우저 분석 SDK는 `window.gtag`, `window.fbq`, `window.ttq` 같은 글로벌에 존재합니다. 이
글로벌들은 서버 렌더링 중에는 없습니다. 그래서 모든 클라이언트 플러그인은 무언가를 건드리기 전에
브라우저인지 확인합니다:

```ts
// 각 플러그인의 track() 내부
track(eventName, params, context) {
  if (typeof window === "undefined" || !window.fbq) {
    return; // SSR이거나 SDK 미로딩 → no-op, 오류 없음
  }
  // ...여기서부터 window.fbq 호출 안전
}
```

같은 가드가 `initialize()`, `setUser()`, `setConsent()`에도 적용됩니다. 실질적인 결과는: **SSR
중에 호출된 플러그인은 아무것도 하지 않고, 아무것도 throw하지 않습니다.** 실제 브라우저에서 SDK가
존재할 때까지 조용히 no-op으로 동작합니다.

## SSR 중에 Funnel을 생성해도 됩니다

이 가드들 덕분에, 싱글턴 모듈을 import하고 서버에서 `new Funnel({...})`를 생성하는 것은 완전히
안전합니다. 생성자는 플러그인 목록을 저장할 뿐 — 어떤 브라우저 글로벌도 건드리지 않습니다. 그래서
이 모듈은 서버 컴포넌트에서 import해도 괜찮습니다:

```ts
// lib/funnel.ts — 서버에서 import 안전
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});
```

## 단 하나의 규칙: 초기화는 클라이언트에서

플러그인이 서버에서 no-op이긴 하지만, 그곳에서 `initialize()`나 `track()`을 호출할 이유는
없습니다 — 아무 쓸모도 없으니까요. 그래서 규칙은 간단합니다: **생성은 어디서든, 초기화와 추적은
클라이언트에서.**

React 기반 프레임워크에서 "클라이언트에서"란 effect 안을 뜻하며, 이는 서버 렌더링 중에는 절대
실행되지 않습니다:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { funnel, pluginConfigs } from "@/lib/funnel";

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    funnel.initialize(pluginConfigs); // 브라우저에서만 실행
  }, []);

  return <>{children}</>;
}
```

이는 [Next.js 프레임워크 연동](/ko/guides/framework-integration/) 가이드의 바로 그 패턴입니다.

## 서버 렌더 중 오류 없음

종합하면, 서버 렌더와 클라이언트 하이드레이션을 거치며 일어나는 일은 이렇습니다:

1. **서버 렌더:** `funnel.ts`가 import되고 `new Funnel(...)`가 실행됩니다. 브라우저 글로벌은
   건드리지 않습니다. `initialize()`나 `track()`은 (effect 안에 있으므로) 발생하지 않습니다.
   아무것도 throw하지 않습니다.
2. **클라이언트 하이드레이션:** effect가 실행되고, `initialize()`가 플러그인을 부팅하며, 이제
   `track()` 호출이 실제 `window.gtag` / `window.fbq`에 도달합니다.

만약 어떤 `track()`이 SDK 로딩 전에 실행되더라도, `typeof window`/SDK 가드가 이를 오류 대신
no-op으로 만듭니다 — 그리고 이벤트를 잃지도 않습니다. [`initialize()` 전에 추적된 이벤트는 큐에
쌓였다가 재생되기](/ko/guides/core-concepts/) 때문입니다.

:::tip[CAPI와 sGTM 플러그인도 마찬가지]
서버사이드 지향 플러그인(`meta-conversion-api`, `sgtm`)도 같은 방식으로 가드합니다:
`typeof window === "undefined"`이거나 `endpoint`가 설정되지 않으면 no-op이므로, 이들을 추가해도
SSR이 깨지지 않습니다.
:::

## 다음으로

- [프레임워크 연동](/ko/guides/framework-integration/) — 구체적인 Next.js 설정.
- [핵심 개념](/ko/guides/core-concepts/) — initialize 이전 이벤트 큐.
