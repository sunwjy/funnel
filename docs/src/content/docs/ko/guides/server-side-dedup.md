---
title: 서버사이드 & 중복 제거
description: 이벤트별 eventId로 브라우저 Meta Pixel과 Conversions API를 짝지어 중복 집계를 피하기.
sidebar:
  order: 5
---

*같은* 전환을 브라우저와 서버 양쪽에서 보내면 추적이 훨씬 안정적이 됩니다: 광고 차단기와 쿠키
제한은 브라우저 이벤트를 잃게 만들고, 서버 이벤트는 브라우저 전용 신호 일부를 놓칩니다. 문제는
중복 집계입니다. 구매가 한 번뿐인데 플랫폼이 두 번으로 봅니다. 중복 제거(deduplication)가
이를 해결하며, Funnel은 이벤트별 `eventId`로 이를 자동화합니다.

## `eventId`가 중복 제거 키입니다

`track()` 호출마다 Funnel은 고유한 `eventId`(UUID)를 생성해, 같은 호출 안의 **모든** 플러그인에
[EventContext](/ko/guides/core-concepts/)로 전달합니다. 그 호출의 모든 플러그인이 *동일한*
`eventId`를 보기 때문에, 같은 동작을 보고하는 브라우저 이벤트와 서버 이벤트가 같은 식별자를
가지므로, 플랫폼은 둘을 하나로 취급합니다.

```ts
funnel.track("purchase", { transaction_id: "T-1", currency: "KRW", value: 29000 });
// Funnel이 eventId 하나(예: "a1b2c3…")를 생성해 모든 플러그인에 넘깁니다:
//   → meta-pixel           fbq("track", "Purchase", …, { eventID: "a1b2c3…" })
//   → meta-conversion-api  서버로 POST { event_id: "a1b2c3…", … }
// Meta는 둘을 보고, event_id로 매칭해 구매를 하나로 집계합니다.
```

`eventId`는 직접 관리하지 않습니다. `initialize()` 전에 큐에 쌓인 이벤트까지 포함해 Funnel이
처리합니다.

## Meta Pixel과 Conversions API 짝짓기

기준이 되는 구성은 브라우저 **Meta Pixel**(`meta-pixel`)과 **Meta Conversions API**
(`meta-conversion-api`) 클라이언트 플러그인입니다. 둘 다 같은 Funnel에 추가하세요:

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
import { createMetaConversionApiPlugin } from "@sunwjy/funnel-client/meta-conversion-api";

export const funnel = new Funnel({
  plugins: [
    createMetaPixelPlugin(),
    createMetaConversionApiPlugin(),
  ],
});

funnel.initialize({
  "meta-pixel": { pixelId: "1234567890" },
  "meta-conversion-api": {
    // Meta CAPI로 전달하는 본인 소유의 서버 엔드포인트.
    endpoint: "https://your-app.com/api/meta-capi",
    // 선택: Events Manager "Test Events" 탭에 이벤트가 보입니다.
    testEventCode: "TEST12345",
  },
});
```

이제 한 번의 `track("purchase", …)`가 같은 `eventId`로 두 가지를 합니다:

- **Pixel**은 `fbq("track", "Purchase", …, { eventID })`로 브라우저 이벤트를 보냅니다.
- **CAPI 플러그인**은 *본인*의 `endpoint`로 페이로드를 POST하며, 여기에는 `event_id`, 이벤트
  이름, `event_source_url`, 그리고 `custom_data`(통화, 금액, 주문 ID, items)가 포함됩니다.

그다음 본인의 서버 엔드포인트가 그 페이로드를 Meta Conversions API로 전달합니다. Meta는 둘을
`event_id`로 매칭해 중복을 제거합니다.

:::caution[CAPI 플러그인은 본인 서버가 필요합니다]
`meta-conversion-api`는 *클라이언트* 플러그인입니다: 이벤트를 수집해 **본인**의 엔드포인트로
POST할 뿐이며, Meta를 직접 호출하지 않습니다(CAPI 액세스 토큰은 절대 브라우저에 두면 안 됩니다).
페이로드를 받아 본인 토큰으로 Meta에 전달하는 서버 라우트는 직접 제공해야 합니다. `endpoint`가
설정되지 않으면 플러그인은 no-op입니다.
:::

### PII는요?

CAPI 플러그인은 PII 필드(이메일, 전화번호, 이름, 사용자 ID)를 전송 전에 **브라우저에서** SHA-256으로
해싱하므로, 엔드포인트는 항상 해싱된 값만 받습니다. 값은
`funnel.setUser({ email, phone_number, first_name, last_name, user_id })`로 제공하세요. 브라우저가
해싱할 수 없으면(SubtleCrypto 없음), 해당 필드는 평문으로 보내지 않고 생략됩니다.

## 서버사이드 GTM (GA4 Measurement Protocol)

같은 `eventId` 메커니즘이 **sGTM** 플러그인(`sgtm`)을 통한 Google 측 하이브리드 구성도
가능하게 합니다. 이 플러그인은 Measurement Protocol v2로 GA4 형식 이벤트를 서버사이드 GTM
컨테이너에 직접 보내며, `eventId`를 GA4 `event_id` 파라미터로 전파해 서버사이드 태깅이 브라우저
GA4/GTM 이벤트와 중복 제거할 수 있게 합니다.

```ts
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createSGTMPlugin } from "@sunwjy/funnel-client/sgtm";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createSGTMPlugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  sgtm: {
    endpoint: "https://sgtm.example.com", // 서버사이드 GTM 컨테이너 URL
    measurementId: "G-XXXXXXXXXX",
  },
});
```

:::caution[API 시크릿을 브라우저 밖에 두세요]
GA4 Measurement Protocol `apiSecret`은 민감 정보입니다. `sgtm` 플러그인은
`allowApiSecretInBrowser: true`를 명시적으로 설정하지 않는 한 브라우저에서 이를 보내기를
거부합니다. DevTools, 프록시 로그, CDN 액세스 로그에 노출되기 때문입니다. 권장 방식은 `apiSecret`을
설정하지 않고, sGTM 컨테이너가 브라우저 트래픽에 대해 api_secret 검증을 건너뛰게 하는 것입니다.
:::

## 다음으로

- [핵심 개념](/ko/guides/core-concepts/): `EventContext`와 `eventId`에 대해 더 보기.
- [SSR 주의사항](/ko/guides/ssr/): 이 플러그인들이 SSR에서 안전하게 생성되는 이유.
- [플러그인 카탈로그](/ko/plugins/): `meta-conversion-api`와 `sgtm`의 전체 설정.
