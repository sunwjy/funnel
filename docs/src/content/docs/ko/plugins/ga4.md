---
title: Google Analytics 4
description: Funnel의 GA4 표준 이벤트를 window.gtag로 Google Analytics 4에 그대로 전송합니다.
sidebar:
  order: 1
---

GA4 플러그인은 Funnel 이벤트를 `window.gtag`를 통해 **Google Analytics 4**로 전송합니다.
Funnel의 이벤트는 이미 GA4 스키마를 따르므로, 이 플러그인은 변환 없이 그대로 전달합니다.

## 무엇을 추적하나요

모든 Funnel 이벤트는 동일한 이름과 파라미터를 가진 GA4 `event`로 전달되며, 플랫폼 간
중복 제거를 위한 `event_id`([`EventContext`](/ko/start-here/quickstart/)에서 가져옴)가
함께 전송됩니다. `setUser`는 `gtag("set", ...)`로, 동의는 Consent Mode v2에 1:1로 매핑됩니다.

## 시작하기 전에

- GA4 속성에서 발급받은 **GA4 측정 ID**(`G-XXXXXXXXXX` 형태).
- 페이지 `<head>`에 로드된 표준 GA4 기본 스니펫(gtag.js) — Funnel이 실행되기 전에
  `window.gtag`가 존재해야 합니다. Funnel은 `gtag`를 호출만 하며, 직접 로드하지는 않습니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";

export const funnel = new Funnel({
  plugins: [createGA4Plugin()],
  debug: true,
});

funnel.initialize({
  ga4: {
    measurementId: "G-XXXXXXXXXX",
    // 선택: gtag("config", id, config)로 전달됩니다
    config: { send_page_view: false },
  },
});
```

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "KRW",
  value: 29000,
  transaction_id: "T-1",
});
```

## 검증

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 콘솔에 기록됩니다.
- `config: { debug_mode: true }`를 설정하고 Google Analytics UI의 **DebugView**를 엽니다.
- 브라우저 DevTools 네트워크 탭에서 나가는 `gtag` 호출(`google-analytics.com` 요청)을
  확인합니다.

## 참고

- **SSR 안전**: `window`(또는 `window.gtag`)가 없으면 `track`, `setUser`, `setConsent`는
  조용히 건너뜁니다 — 오류가 발생하지 않습니다.
- `config` 필드는 `gtag("config", measurementId, config)`로 그대로 전달되므로 GA4 SDK
  동작(`send_page_view`, `cookie_domain`, `anonymize_ip` 등)을 제어할 수 있습니다.
- `setConsent`는 Google Consent Mode v2 신호
  (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`)에 1:1로 매핑됩니다.
