---
title: Server-side GTM
description: Funnel의 GA4 이벤트를 Measurement Protocol로 서버사이드 GTM 컨테이너에 POST합니다.
sidebar:
  order: 3
---

sGTM 플러그인은 Funnel 이벤트를 GA4 **Measurement Protocol v2** JSON 엔드포인트를 사용해
**서버사이드 Google Tag Manager** 컨테이너로 직접 전송합니다. `gtm` 플러그인(`window.dataLayer`에
push하고 브라우저 스니펫에 의존)과 달리, 이 플러그인은 브라우저 컨테이너를 완전히 우회하여
각 이벤트를 직접 관리하는 URL로 `POST`합니다.

## 무엇을 추적하나요

모든 Funnel 이벤트는 동일한 이름과 파라미터를 가진 하나의 Measurement Protocol 이벤트로
전송되며, `event_id`(브라우저 이벤트와의 중복 제거용), 유도된 `session_id`,
`engagement_time_msec`가 함께 전송됩니다. `setUser`의 사용자 식별 정보는 `user_id` /
`user_properties`로 첨부됩니다. 이벤트 이름 매핑은 없으며 이름은 그대로 전달됩니다.

## 시작하기 전에

이것은 **서버 릴레이** 플러그인입니다: `gtag`나 `fbq` 같은 **브라우저 픽셀 전역 객체가 없습니다**.
대신 다음이 필요합니다:

- sGTM 컨테이너의 **엔드포인트** URL(예: `https://sgtm.example.com`).
- **GA4 측정 ID**(`G-XXXXXXXXXX`).
- `client_id` — `localStorage`(`_funnel_sgtm_cid`)에 자동으로 생성·유지되거나 `clientId`로
  직접 지정할 수 있습니다.

GA4 Measurement Protocol **API 시크릿**은 브라우저 코드에 넣지 *않는* 것이 좋습니다: DevTools,
프록시 로그, CDN 액세스 로그에 노출됩니다. 권장 설정은 `apiSecret`을 비워두고 sGTM 컨테이너가
브라우저 트래픽에 대해 api_secret 검증을 건너뛰도록 하는 것입니다. 반드시 전송해야 한다면 위험을
인지하는 의미로 `allowApiSecretInBrowser: true`도 함께 설정해야 합니다 — 그렇지 않으면 플러그인이
이를 제거하고 오류를 기록합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createSGTMPlugin } from "@sunwjy/funnel-client/sgtm";

export const funnel = new Funnel({
  plugins: [createSGTMPlugin()],
  debug: true,
});

funnel.initialize({
  sgtm: {
    endpoint: "https://sgtm.example.com",
    measurementId: "G-XXXXXXXXXX",
    // path 기본값은 "/mp/collect"
    // engagementTimeMsec 기본값은 1
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

- `Funnel`에 `debug: true`를 켜면 각 디스패치가 기록됩니다.
- **네트워크 탭**에서 `endpoint` + path(기본값 `/mp/collect`)로 향하는 `POST` 요청을 확인합니다.
- **GA4 DebugView**(또는 sGTM 컨테이너 미리보기)를 열어 이벤트 도착을 확인합니다.

## 참고

- **SSR 안전**: `window`가 없거나 `endpoint` / `measurementId`가 누락되면 `track`은 아무 동작을
  하지 않습니다.
- `client_id`는 `localStorage`에, `session_id`는 30분 유휴 타임아웃(GA4 기본값)과 함께
  `sessionStorage`에 유지됩니다.
- `consentRequired: true`로 설정하면 `setConsent`를 통해 `analytics_storage`가 허용될 때까지
  이벤트를 버립니다. 기본값은 게이팅 없음(플랫폼 위임)입니다.
- `nonPersonalizedAds`와 커스텀 `engagementTimeMsec`을 설정할 수 있으며, `engagementTimeMsec`의
  기본값은 GA4 참여도 지표 오염을 막기 위해 `1`입니다.
