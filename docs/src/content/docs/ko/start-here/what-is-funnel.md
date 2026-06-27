---
title: Funnel이란?
description: Funnel이 해결하는 문제와 그 바탕에 있는 하나의 아이디어를 이해합니다.
sidebar:
  order: 1
---

마케팅 캠페인을 운영한다면 같은 이벤트(페이지 조회, 회원가입, 구매)를 여러 분석 도구에 보내고
있을 것입니다. Google Analytics, Meta Pixel, TikTok 등 각각 자체 SDK, 자체 이벤트 이름,
자체 파라미터 구조를 가지고 있습니다. 이걸 따로따로 연결하는 건 반복적이고 서로 어긋나기 쉽습니다.

**Funnel은 하나의 아이디어로 이를 해결합니다: 각 이벤트를 GA4 표준으로 한 번만 작성하고,
플러그인이 모든 플랫폼에 맞게 번역하게 합니다.**

```ts
// 당신은 이것만 한 번 작성합니다:
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });

// Funnel이 연결된 모든 플러그인으로 전달하고, 각자 자기 형식으로 매핑합니다:
//   → GA4        gtag("event", "purchase", …)
//   → Meta Pixel fbq("track", "Purchase", …)
//   → TikTok     ttq.track("CompletePayment", …)
```

## 머릿속 모델

- **GA4가 표준 스키마입니다.** 모든 이벤트 이름과 파라미터는 GA4 규칙을 따릅니다. 플러그인은
  GA4 *에서* 자기 플랫폼으로 매핑할 뿐, 반대 방향은 없습니다.
- **`track()` 한 번이 모든 플러그인으로 퍼집니다.** 플러그인은 한 번만 연결하면 됩니다.
- **플러그인은 오류 격리됩니다.** 한 플러그인이 예외를 던져도 다른 플러그인은 이벤트를 받습니다.
- **모든 이벤트에 고유 `eventId`가 부여됩니다.** 이를 통해 서버사이드 중복 제거가 가능합니다
  (예: 브라우저 Meta Pixel 이벤트와 서버사이드 Conversions API 이벤트 매칭).

## Funnel이 아닌 것

- 분석 **제품이 아닙니다**. 분석 도구로 데이터를 *보낼* 뿐, 저장하거나 시각화하지 않습니다.
- 플랫폼 SDK를 **포함하지 않습니다.** `gtag`, `fbq` 등은 평소처럼 직접 로드하고, Funnel이
  그 전역 객체를 호출해 줍니다.

## 다음 단계

1. [Funnel 설치](/ko/start-here/installation/)
2. [5분 만에 첫 이벤트 보내기](/ko/start-here/quickstart/)
3. 더 깊이 들어가려면 [핵심 개념](/ko/guides/)을 읽어보세요.
