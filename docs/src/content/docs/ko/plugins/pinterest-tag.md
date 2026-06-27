---
title: Pinterest Tag
description: window.pintrk를 통해 Funnel의 GA4 이벤트를 Pinterest 태그로 전송합니다.
sidebar:
  order: 17
---

Pinterest Tag 플러그인은 Funnel을 **Pinterest 광고**에 연결합니다. Funnel의 GA4 표준 이벤트를
Pinterest Tag의 표준 이벤트로 매핑하고 `window.pintrk`를 통해 전송합니다. 매핑되지 않은 이벤트는
원래 GA4 이름을 보존한 `custom` 이벤트로 전송됩니다.

## 무엇을 추적하나요

| Funnel 이벤트 (GA4) | Pinterest 이벤트 |
| --- | --- |
| `page_view` | `pagevisit` |
| `view_item_list` | `viewcategory` |
| `select_promotion` | `viewcategory` |
| `search` | `search` |
| `view_search_results` | `search` |
| `add_to_cart` | `addtocart` |
| `purchase` | `checkout` |
| `sign_up` | `signup` |
| `generate_lead` | `lead` |

그 외 이벤트(`begin_checkout` 포함)는 `pintrk("track", "custom", { ..., event_name: "<ga4 이름>" })`로
전송됩니다. 모든 이벤트는 Conversions API와의 중복 제거를 위해 `event_id`(Funnel의 `eventId`)를
포함합니다.

## 시작하기 전에

- **Pinterest Tag ID**(광고주 광고 계정 태그).
- 페이지에 로드된 Pinterest 기본 태그. Funnel이 실행되기 전에 `window.pintrk`가 존재해야 합니다.

## 설치 및 초기화

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createPinterestTagPlugin } from "@sunwjy/funnel-client/pinterest-tag";

export const funnel = new Funnel({
  plugins: [createPinterestTagPlugin()],
  debug: true,
});

funnel.initialize({
  "pinterest-tag": { tagId: "2612345678901" },
});
```

`consentRequired: true`는 선택 사항입니다. 설정하면 `funnel.setConsent(...)`로 `ad_storage`를
허용할 때까지 이벤트가 드롭됩니다.

## 이벤트 추적

```ts
funnel.track("purchase", {
  currency: "USD",
  value: 60,
  transaction_id: "T-8008",
  items: [{ item_id: "SKU-3", item_name: "Hat", price: 60, quantity: 1 }],
});
```

이 호출은 `pintrk("track", "checkout", { currency: "USD", value: 60, order_id: "T-8008", order_quantity: 1, line_items: [...], event_id: "..." })`를 실행합니다.

## 검증

- Funnel에 `debug: true`를 설정하면 각 전송이 콘솔에 기록됩니다.
- **Pinterest Tag Helper** 브라우저 확장 프로그램을 설치하면 발생하는 이벤트를 확인할 수 있습니다.
- DevTools에서 `window.pintrk`가 존재하는지 확인하고 Network 탭에서 `ct.pinterest.com`으로 가는
  요청을 관찰하세요.

## 참고

- **SSR 안전.** `window`(또는 `window.pintrk`)가 없으면 플러그인은 아무 동작도 하지 않습니다.
- `begin_checkout`은 의도적으로 Pinterest `checkout`에 매핑되지 **않습니다**. Pinterest의
  `checkout`은 *완료된* 구매를 의미하므로, 전환 수가 부풀려지는 것을 막기 위해 대신 `custom`
  이벤트로 전달됩니다.
- `funnel.setUser(...)`는 향상된 매칭(enhanced match)을 위해 `pintrk("set", ...)`을 호출하며,
  `email`→`em`, `phone_number`→`ph`, `user_id`→`external_id`, `first_name`→`fn`,
  `last_name`→`ln`으로 매핑합니다.
- 항목 배열은 `product_id`/`product_name`/`product_price`/`product_quantity`/`product_category`를
  갖는 `line_items`가 됩니다.
