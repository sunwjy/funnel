# Funnel

[![CI](https://github.com/sunwjy/funnel/actions/workflows/ci.yml/badge.svg)](https://github.com/sunwjy/funnel/actions/workflows/ci.yml)
[![npm: funnel-client](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-client?label=funnel-client)](https://www.npmjs.com/package/@sunwjy/funnel-client)
[![npm: funnel-core](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-core?label=funnel-core)](https://www.npmjs.com/package/@sunwjy/funnel-core)
[![bundle size](https://deno.bundlejs.com/badge?q=%40sunwjy%2Ffunnel-client)](https://bundlejs.com/?q=%40sunwjy%2Ffunnel-client)
[![license](https://img.shields.io/npm/l/%40sunwjy%2Ffunnel-client)](./LICENSE)

[English](./README.md) | 한국어

핵심 마케팅 퍼널 이벤트를 단일 인터페이스로 연결된 모든 분석 도구에 전송하는 라이브러리입니다.

이벤트와 파라미터는 GA4 표준을 기반으로 정의됩니다. 각 플러그인이 이를 대상 도구의 네이티브 포맷으로 변환합니다.

## 패키지

| 패키지 | 설명 |
|---------|-------------|
| `@sunwjy/funnel-core` | 이벤트 타입, 플러그인 인터페이스, Funnel 클래스, `EventContext`(자동 생성 `eventId`) |
| `@sunwjy/funnel-client` | 모든 클라이언트 사이드 플러그인 (GA4, GTM, sGTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok, Kakao, Naver, X, LinkedIn, Mixpanel, Amplitude, 토스애즈, Reddit, 당근, Pinterest) |

### 클라이언트 플러그인

| 서브패스 | 설명 |
|---------|-------------|
| `@sunwjy/funnel-client/ga4` | Google Analytics 4 (`gtag`) |
| `@sunwjy/funnel-client/gtm` | Google Tag Manager (`dataLayer`) |
| `@sunwjy/funnel-client/sgtm` | 서버 사이드 GTM 릴레이 (GA4 Measurement Protocol v2) |
| `@sunwjy/funnel-client/meta-pixel` | Meta Pixel (`fbq`) |
| `@sunwjy/funnel-client/google-ads` | Google Ads 전환 추적 (`gtag`) |
| `@sunwjy/funnel-client/tiktok-pixel` | TikTok Pixel (`ttq`) |
| `@sunwjy/funnel-client/kakao-pixel` | 카카오 픽셀 (`kakaoPixel`) |
| `@sunwjy/funnel-client/naver-ad` | 네이버 광고 WCSLOG (`wcs`) |
| `@sunwjy/funnel-client/x-pixel` | X/Twitter Pixel (`twq`) |
| `@sunwjy/funnel-client/linkedin-insight` | LinkedIn Insight Tag (`lintrk`) |
| `@sunwjy/funnel-client/mixpanel` | Mixpanel (`mixpanel`) |
| `@sunwjy/funnel-client/meta-conversion-api` | Meta Conversion API (`sendBeacon`/`fetch` 기반 서버 사이드 릴레이) |
| `@sunwjy/funnel-client/amplitude` | Amplitude (`amplitude`) |
| `@sunwjy/funnel-client/toss-ads` | 토스애즈 픽셀 (`TossPixel`) |
| `@sunwjy/funnel-client/reddit-pixel` | Reddit Pixel (`rdt`) |
| `@sunwjy/funnel-client/daangn-ads` | 당근비즈니스 전환 추적 (`karrotPixel`) |
| `@sunwjy/funnel-client/pinterest-tag` | Pinterest Tag (`pintrk`) |

## 사용법

```ts
// 배럴 임포트 (트리 셰이킹 가능)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// 또는 서브패스 임포트 (모든 번들러에서 트리 셰이킹 보장)
// import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
// import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

const funnel = new Funnel({
  plugins: [
    // 팩토리에서 타입이 지정된 설정 — 컴파일 타임에 검증됨
    createGA4Plugin({ measurementId: "G-XXXXXXXXXX" }),
    createMetaPixelPlugin({ pixelId: "1234567890" }),
  ],
});

funnel.initialize();

// 타입 안전한 이벤트 추적 — 이벤트 이름별로 매칭되는 파라미터만 허용
funnel.track("purchase", {
  currency: "USD",
  value: 29.99,
  transaction_id: "T-001",
  items: [
    { item_id: "SKU-1", item_name: "Premium Plan", price: 29.99, quantity: 1 },
  ],
});
```

단 한 번의 `track` 호출로 GA4와 Meta Pixel 양쪽에 이벤트가 전송됩니다.

설정은 `initialize()`에서 런타임에 공급(또는 키 단위로 덮어쓰기)할 수도 있습니다 — ID가 원격 설정에서 내려오는 경우에 유용합니다:

```ts
funnel.initialize({
  ga4: { measurementId: "G-RUNTIME" }, // 팩토리 값을 덮어씀
  "meta-pixel": { pixelId: "1234567890" },
});
```

### `initialize()` 이전의 이벤트

`initialize()` 이전에 호출된 `track()`은 유실되지 않습니다. 최대 100개의 이벤트가 큐에 쌓였다가 초기화 완료 후(`setUser`/`setConsent` 재생 이후) 순서대로 재생됩니다. 큐에 들어간 각 이벤트는 호출 시점에 생성된 `eventId`를 유지하므로 크로스 플랫폼 중복 제거가 그대로 보장됩니다.

## 사용자 식별 (`setUser` / `resetUser`)

사용자 식별 정보를 한 번만 설정하면 이를 지원하는 모든 플러그인에 전파됩니다. 포맷은 GA4의 사용자 속성(user properties) 모델을 따릅니다.

```ts
// 로그인 후
funnel.setUser({
  user_id: "U-12345",
  email: "user@example.com",
  phone_number: "+821012345678",
  first_name: "Jaeyun",
  last_name: "Woo",
  plan: "premium", // 커스텀 속성도 지원
});

// 로그아웃 후
funnel.resetUser();
```

`setUser`는 `initialize()` 이전에 호출해도 됩니다 — 속성이 저장되었다가 초기화 과정에서 각 플러그인에 자동으로 재생됩니다.

### UserProperties

| 필드 | 타입 | 설명 |
|-------|------|-------------|
| `user_id` | `string?` | 기기 간 안정적인 식별자 (GA4 `user_id`) |
| `email` | `string?` | 고급 매칭용 이메일 (Meta, TikTok, X, Google Ads) |
| `phone_number` | `string?` | E.164 형식 전화번호 (예: `"+821012345678"`) |
| `first_name` | `string?` | 이름 (Meta Advanced Matching, Google Enhanced Conversions) |
| `last_name` | `string?` | 성 (Meta Advanced Matching, Google Enhanced Conversions) |
| `[key]` | `unknown` | 임의의 커스텀 사용자 속성 |

### 플러그인별 매핑

| 플러그인 | `setUser` | `resetUser` |
|--------|-----------|-------------|
| GA4 | `gtag("set", { user_id })` + `gtag("set", "user_properties", {...})` | `gtag("set", { user_id: null })` + 설정된 사용자 속성 제거 |
| GTM | `dataLayer.push({ event: "funnel.set_user", user_id, user_properties })` | `dataLayer.push({ event: "funnel.reset_user", ... })` |
| sGTM | 속성을 저장; 모든 Measurement Protocol 페이로드에 `user_id` + `user_properties` 포함 | 저장된 데이터 제거 |
| Meta Pixel | `fbq("init", pixelId, { em, fn, ln, ph, external_id })` | — (Meta에 공식 초기화 해제 API 없음; 페이지 언로드까지 데이터 유지) |
| Meta CAPI | `em`/`ph`/`fn`/`ln`/`external_id`를 한 번만 SHA-256 해싱 후 모든 `track`의 `user_data`에 병합 | 저장된 데이터 제거 |
| TikTok Pixel | `ttq.identify({ email, phone_number, external_id })` | — (TikTok에 식별 해제 API 없음) |
| Mixpanel | `mixpanel.identify(user_id)` + `mixpanel.people.set({ $email, ... })` | `mixpanel.reset()` |
| Amplitude | `amplitude.setUserId(user_id)` + `new amplitude.Identify().set(...)` | `amplitude.setUserId(null)` |
| Google Ads | `gtag("set", "user_data", { email, phone_number, address })` | `gtag("set", "user_data", null)` |
| X Pixel | 정규화된 `email_address` / E.164 `phone_number`를 저장해 모든 이벤트에 첨부 (픽셀이 자동 해싱) | 저장된 데이터 제거 |
| Pinterest Tag | `pintrk("set", { em, ph, external_id, fn, ln })` (태그가 원본 값을 해싱) | — |
| Kakao Pixel | — (API 없음) | — |
| Naver Ad | — (API 없음) | — |
| LinkedIn | — (API 없음) | — |
| Toss Ads | — (공개 API 없음) | — |
| Reddit Pixel | — (API 없음) | — |
| Daangn Ads | — (API 없음) | — |

## 동의 모드 (`setConsent`)

동의(consent)는 [Google Consent Mode v2](https://developers.google.com/tag-platform/security/concepts/consent-mode) 시그널 모델을 따릅니다. 부분 업데이트는 마지막 상태에 병합된 뒤 모든 플러그인에 전달되며, `initialize()` 이전 호출은 저장되었다가 초기화 시 가장 먼저 적용됩니다.

```ts
// 예: CMP / 쿠키 배너에 연결
funnel.setConsent({
  ad_storage: "denied",
  analytics_storage: "granted",
  ad_user_data: "denied",
  ad_personalization: "denied",
});
```

### 플랫폼별 동작

| 플러그인 | 동작 |
|--------|----------|
| GA4 / Google Ads / GTM | `gtag("consent", "update", state)` — denied 상태에서도 Google의 모델링(쿠키리스 핑)은 계속 동작합니다. GTM은 gtag 스텁이 없으면 no-op입니다. |
| Meta Pixel | `ad_storage`를 다운 매핑한 `fbq("consent", "grant" \| "revoke")` |
| 나머지 전체 | 네이티브 동의 API 없음. 기본값은 이벤트를 계속 흘려보내는 것(플랫폼 위임)입니다. 플러그인 설정에 `consentRequired: true`를 지정하면 해당 시그널이 granted가 될 때까지 이벤트를 차단합니다 — 광고 플랫폼(Meta CAPI, TikTok, Kakao, Naver, X, LinkedIn, 토스애즈, Reddit, 당근, Pinterest)은 `ad_storage`, 분석 도구(sGTM, Mixpanel, Amplitude)는 `analytics_storage`를 기준으로 합니다. |

```ts
// 옵트인 게이팅 예시: ad_storage가 granted될 때까지 TikTok 이벤트 보류
createTikTokPixelPlugin({ pixelId: "XXXX", consentRequired: true });
```

## 이벤트 중복 제거 (`eventId`)

모든 `funnel.track()` 호출은 고유한 `eventId`(UUID)를 자동 생성하고 `EventContext`를 통해 모든 플러그인에 전달합니다. 이로써 클라이언트 사이드 픽셀과 서버 사이드 API 간 중복 제거(예: Meta Pixel + Conversion API)가 가능해집니다.

- Meta Pixel 플러그인은 `eventId`를 `fbq()` 호출의 `eventID` 파라미터로 전달
- Meta Conversion API 플러그인은 서버 페이로드에 `event_id`를 포함
- 서버는 공유된 `eventId`로 이벤트를 매칭해 이중 집계를 방지

## 지원 이벤트

마케팅 퍼널과 관련된 GA4 표준 이벤트만 포함합니다.

| 퍼널 단계 | 이벤트 |
|--------------|--------|
| 인지 (Awareness) | `page_view`, `view_promotion`, `select_promotion` |
| 획득 (Acquisition) | `sign_up`, `generate_lead` |
| 참여 (Engagement) | `login`, `share` |
| 고려 (Consideration) | `search`, `view_search_results`, `view_item_list`, `select_item`, `view_item` |
| 의도 (Intent) | `add_to_wishlist`, `add_to_cart`, `remove_from_cart`, `view_cart` |
| 전환 (Conversion) | `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` |
| 구매 후 (Post-purchase) | `refund` |

## 플러그인 이벤트 매핑

GA4 플러그인은 `gtag("event", ...)`로 이벤트를 그대로 전달합니다.

GTM 플러그인은 GA4 이벤트 이름을 `event` 키로 하여 `dataLayer`에 push합니다. 이후 GTM 컨테이너가 설정된 트리거에 따라 각 이벤트를 적절한 태그로 라우팅합니다. 이커머스 이벤트의 경우 GA4 스펙 키(`items`, `currency`, `value`, `coupon`, `transaction_id`, `shipping`, `tax`, …)는 관례적인 `ecommerce` 객체 아래에 중첩되고(매 push 전에 `ecommerce: null`로 초기화), 커스텀 파라미터는 GTM 변수가 읽을 수 있도록 push 최상위에 유지됩니다.

sGTM 플러그인은 브라우저 GTM 컨테이너를 완전히 우회합니다. 각 이벤트는 GA4 Measurement Protocol v2 포맷으로 설정된 서버 사이드 GTM 엔드포인트(`{ endpoint, measurementId }`)에 POST됩니다. `eventId`는 `event_id`로 전달되고, 자동 관리되는 `client_id`(`localStorage`에 저장)와 `session_id`(30분 유휴 타임아웃, GA4 기본값)가 모든 이벤트에 첨부됩니다.

Meta Pixel 플러그인은 이벤트를 Meta 표준 이벤트로 매핑합니다:

| GA4 이벤트 | Meta Pixel 이벤트 |
|-----------|------------------|
| `page_view` | `PageView` |
| `view_item` / `view_item_list` / `select_item` | `ViewContent` |
| `search` | `Search` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `add_payment_info` | `AddPaymentInfo` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `CompleteRegistration` |
| 나머지 | `trackCustom` (원본 이벤트 이름 유지) |

`items` 배열은 Meta Pixel의 `content_ids`, `contents`, `num_items`로 자동 변환됩니다. `eventId`는 Conversion API 중복 제거를 위해 `eventID`로 전달됩니다.

### Meta Conversion API

클라이언트 사이드 이벤트 데이터 + 사용자 데이터(`_fbp`, `_fbc` 쿠키, `userAgent`, 페이지 URL)를 수집해 설정된 서버 엔드포인트로 `sendBeacon`/`fetch`를 통해 POST합니다. 서버는 이를 Meta의 Conversion API로 전달합니다. 각 페이로드에는 Meta Pixel과의 중복 제거를 위한 `EventContext`의 `event_id`가 포함됩니다.

`setUser`의 PII(`email`, `phone_number`, `first_name`, `last_name`, `user_id`)는 **브라우저에서** 정규화 후 SHA-256 해싱됩니다 — `setUser`당 한 번 해싱되어 이벤트 간에 재사용되므로 서버 엔드포인트는 원본 PII를 절대 받지 않습니다. `_fbc` 쿠키가 없으면 `fbclid` 쿼리 파라미터로부터 `fbc`를 한 번 합성하여 이벤트 간에 안정적으로 유지합니다.

설정: `{ endpoint: "https://your-server.com/api/meta-capi", testEventCode?: "TEST123", consentRequired?: true }`

### Google Ads

`gtag("event", "conversion", { send_to })`로 전환 이벤트를 전송합니다. 설정에 `conversionId`와 `conversionLabels` 매핑이 필요합니다. 전환 라벨이 설정된 이벤트만 전송되며, 라벨이 없는 이벤트는 버려집니다 — `send_to` 없는 `gtag("event")` 호출은 설정된 **모든** gtag 대상으로 라우팅되어, GA4 플러그인이 함께 등록된 경우 GA4에서 이중 집계되기 때문입니다.

### TikTok Pixel

| GA4 이벤트 | TikTok Pixel 이벤트 |
|-----------|-------------------|
| `page_view` | `ttq.page()` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `add_payment_info` | `AddPaymentInfo` |
| `purchase` | `CompletePayment` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `SubmitForm` |
| 나머지 | 커스텀 이벤트 (원본 이름) |

`select_item`은 의도적으로 `ClickButton`에 매핑하지 **않습니다** — TikTok의 `ClickButton`은 상품 외 CTA용이며, 상품 리스트 클릭을 여기에 섞으면 Ads Manager에서 해당 카운터가 부풀려집니다.

### 카카오 픽셀

| GA4 이벤트 | 카카오 픽셀 메서드 |
|-----------|-------------------|
| `page_view` | `pageView()` |
| `search` | `search({ keyword })` |
| `view_item` | `viewContent({ id })` |
| `add_to_cart` | `addToCart({ id })` |
| `begin_checkout` | `viewCart()` |
| `purchase` | `purchase({ total_quantity, total_price, currency, products })` |
| `sign_up` | `completeRegistration()` |
| `generate_lead` | `participation()` |
| 나머지 | 무시 (커스텀 이벤트 미지원) |

### 네이버 광고 (WCSLOG)

네이버의 **신규 전환 스크립트 API**(`wcs.trans` 버전)를 사용합니다 — 레거시 `wcs.cnv` 문자열 API는 네이버에서 deprecated되어 지원하지 않습니다. 전환은 `wcs.trans({ type, id, value, items })`로 전송되며, `page_view`는 `wcs_do()`로 PV 비콘을 발사합니다.

설정: `{ accountId: "공통키 (wcs_add[\"wa\"])", siteDomain?: "example.com" }`

| GA4 이벤트 | 네이버 전환 타입 |
|-----------|-----------------------|
| `page_view` | PV 비콘 (`wcs_do()`) |
| `purchase` | `purchase` (`id` = `transaction_id`, `value`, `items` 포함) |
| `sign_up` | `sign_up` |
| `add_to_cart` | `add_to_cart` |
| `generate_lead` | `lead` |
| `add_to_wishlist` | `add_to_wishlist` |
| `begin_checkout` | `begin_checkout` |
| `view_item` | `view_content` |
| 나머지 | 무시 (고정 분류 체계) |

GA4 `items`는 네이버 아이템 스키마(`id`, `name`, `quantity`, `payAmount` = 단가 × 수량, `category` ← `item_category`, `option` ← `item_variant`)로 매핑됩니다. `purchase`에 최상위 `value`가 없으면 라인별 `payAmount` 합계를 사용합니다.

### X (Twitter) Pixel

| GA4 이벤트 | X Pixel 이벤트 |
|-----------|--------------|
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` |
| `search` | `Search` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `Lead` |
| `add_payment_info` | `AddPaymentInfo` |
| 나머지 | 커스텀 이벤트 (원본 이름) |

고급 매칭: `setUser` 이후 정규화된 `email_address`와 E.164 `phone_number`가 X의 공식 이벤트 파라미터로 모든 이벤트에 첨부됩니다 — uwt.js 픽셀이 전송 전에 클라이언트 사이드에서 SHA-256 해싱합니다.

### LinkedIn Insight Tag

`lintrk("track", { conversion_id })`로 전환 이벤트를 전송합니다. 각 GA4 이벤트는 `conversionIds` 설정을 통해 LinkedIn 전환 ID에 매핑되어야 합니다. 페이지 뷰는 Insight Tag가 자동으로 추적합니다.

### Mixpanel

모든 이벤트는 Title Case 이벤트 이름(예: `page_view` → `"Page View"`)으로 `mixpanel.track()`을 통해 전송됩니다. `items` 배열은 `item_ids`, `item_names`, `num_items`로 평탄화됩니다. 그 외 모든 속성은 그대로 전달됩니다.

### Amplitude

모든 이벤트는 Title Case 이벤트 이름으로 `amplitude.track()`을 통해 전송됩니다. `purchase`와 `refund` 이벤트의 경우 Amplitude의 수익 추적을 위해 `value`가 `revenue`로 매핑됩니다. `items` 배열은 Mixpanel과 동일하게 평탄화됩니다.

### 토스애즈 픽셀

| GA4 이벤트 | 토스 픽셀 메서드 |
|-----------|-------------------|
| `page_view` | `pageView()` |
| `view_item` | `productView({ product_id, product_name, ... })` |
| `add_to_cart` | `addToCart({ products, revenue, currency })` |
| `add_to_wishlist` | `addToWishlist({ products, ... })` |
| `begin_checkout` | `initiateCheckout({ order_id, revenue, products, ... })` |
| `purchase` | `purchase({ order_id, revenue, total_quantity, currency, products })` |
| `search` | `search()` (`search_term` → `custom_param2`) |
| `sign_up` | `signUp()` |
| `login` | `signIn()` |
| `generate_lead` | `lead()` |
| 나머지 | 무시 (커스텀 이벤트 미지원) |

토스 픽셀에는 네이티브 중복 제거 ID가 없어 서버 사이드 대사(reconciliation)를 위해 `eventId`를 `custom_param1`로 전달합니다. 기본 통화는 `KRW`입니다.

### Reddit Pixel

| GA4 이벤트 | Reddit Pixel 이벤트 |
|-----------|-------------------|
| `page_view` | `PageVisit` |
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `add_to_wishlist` | `AddToWishlist` |
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `sign_up` | `SignUp` |
| `search` | `Search` |
| 나머지 | `Custom` (`customEventName`으로 원본 이름 유지) |

모든 이벤트에 Reddit Conversions API와의 중복 제거를 위한 `conversionId: eventId`가 포함됩니다.

### 당근(당근비즈니스) 전환 추적

| GA4 이벤트 | 당근 이벤트 |
|-----------|--------------|
| `page_view` | `ViewPage` |
| `view_item` | `ViewContent({ id })` |
| `add_to_cart` | `AddToCart({ products })` |
| `sign_up` | `CompleteRegistration` |
| `purchase` | `Purchase({ total_price, total_quantity, products })` |
| 나머지 | 무시 (커스텀 이벤트 미지원) |

### Pinterest Tag

| GA4 이벤트 | Pinterest 이벤트 |
|-----------|-----------------|
| `page_view` | `pagevisit` |
| `view_item_list` / `select_promotion` | `viewcategory` |
| `search` / `view_search_results` | `search` (`search_query`) |
| `add_to_cart` | `addtocart` |
| `purchase` | `checkout` (`order_id`, `order_quantity`, `line_items`) |
| `sign_up` | `signup` |
| `generate_lead` | `lead` |
| 나머지 | `custom` (`event_name`으로 원본 이름 유지) |

`begin_checkout`은 의도적으로 `checkout`에 매핑하지 **않습니다** — Pinterest의 `checkout`은 *완료된* 구매를 의미하므로 `custom`으로 처리됩니다. 모든 이벤트에 Conversions API 중복 제거를 위한 `event_id: eventId`가 포함됩니다.

## 커스텀 플러그인

`FunnelPlugin` 인터페이스를 구현하면 어떤 분석 도구든 연결할 수 있습니다.

```ts
import type { EventContext, EventMap, EventName, FunnelPlugin, UserProperties } from "@sunwjy/funnel-client";

export function createMyPlugin(): FunnelPlugin {
  return {
    name: "my-plugin",

    initialize(config) {
      // 셋업 로직
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) {
      // context.eventId — 중복 제거용 고유 ID
      // GA4 이벤트를 대상 도구의 포맷으로 변환해 전송
    },

    // 선택 — 대상 도구가 사용자 식별을 지원하면 구현
    setUser(properties: UserProperties) {
      // GA4 사용자 속성을 대상 도구의 포맷으로 매핑
    },

    // 선택 — 로그아웃 지원용
    resetUser() {
      // 대상 도구의 사용자 식별 정보 제거
    },

    // 선택 — Consent Mode v2 시그널 수신
    setConsent(state) {
      // state.ad_storage / state.analytics_storage / ... 를
      // 대상 도구의 동의 API에 매핑하거나 내부에서 전송을 게이팅
    },
  };
}
```

## 예제

`examples/*`에 독립 실행 가능한 예제 3개가 있습니다. 각각 `workspace:*`로 라이브러리를 참조하는 pnpm 워크스페이스 패키지라 항상 현재 소스를 반영합니다.

| 경로 | 스택 | 핵심 데모 | 실행 |
|------|-------|----------|-----|
| `examples/vanilla-html` | Vite + 바닐라 TS | 단일 페이지 퍼널 버튼, 이벤트 로그 패널, `setUser` / `setConsent` | `pnpm --filter @examples/vanilla-html dev` |
| `examples/react-vite` | React 19 + Vite | 다단계 퍼널 (상품 목록 → 장바구니 → 결제 → 완료), React 상태에 연결된 디버그 플러그인 | `pnpm --filter @examples/react-vite dev` |
| `examples/nextjs` | Next.js 15 App Router | 다중 페이지 퍼널 (`/` → `/product/[id]` → `/checkout`), 라우트 변경 시 `page_view`, SSR 안전 | `pnpm --filter @examples/nextjs dev` |

기본적으로 모든 예제는 **플레이스홀더 / 로그 데모 모드**로 동작합니다 — 실제 플랫폼 ID가 필요 없습니다. 디버그 플러그인이 모든 이벤트(`eventId` 포함)를 브라우저 콘솔과 화면 내 이벤트 로그 패널에 기록합니다. 실제 이벤트를 전송하려면 예제 디렉터리에서 `.env.example`을 `.env.local`로 복사하고 GA4 / Meta Pixel ID를 입력하세요.

> **규칙:** 라이브러리 API가 변경되면 예제 3개를 모두 업데이트해 라이브러리와 일관성을 유지하고 CI(`pnpm build && pnpm typecheck`)를 통과시켜야 합니다.

## 개발

```bash
pnpm install     # 의존성 설치
pnpm build       # 전체 패키지 빌드
pnpm typecheck   # 타입 체크
pnpm lint        # 린트
pnpm lint:fix    # 린트 자동 수정
```

## TODO

- [ ] API 문서 — TypeDoc 또는 API Extractor 기반 자동 생성 API 레퍼런스

## 기술 스택

- **모노레포**: pnpm + Turborepo
- **번들러**: tsdown (ESM + CJS 듀얼 빌드, `.d.ts` 생성)
- **린트/포맷**: Biome
- **TypeScript**: strict 모드, `verbatimModuleSyntax`
