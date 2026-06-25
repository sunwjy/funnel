---
title: EventMap
description: Funnel이 지원하는 GA4 기반 이벤트 이름과 각 이벤트의 파라미터 카탈로그.
sidebar:
  order: 1
---

`EventMap`은 정규(canonical) 이벤트 스키마입니다. 지원되는 모든 이벤트 이름을 그 파라미터의
구조에 매핑합니다. GA4가 진실의 원천이므로 아래의 모든 이벤트 이름과 파라미터는 GA4 표준에서
그대로 가져온 것입니다. 플러그인은 이 스키마에서 각 플랫폼의 네이티브 형식으로 매핑하며,
그 반대로는 절대 하지 않습니다.

[`funnel.track(eventName, params)`](/ko/reference/funnel/)를 호출하면 TypeScript가
`EventMap`을 사용해 `params`가 지정한 이벤트와 일치하는지 검사합니다.

```ts
import type { EventMap, EventName } from "@sunwjy/funnel-core";

// EventName은 EventMap의 모든 키의 유니온입니다:
//   "page_view" | "view_promotion" | "sign_up" | ... | "refund"
type Name = EventName;
```

모든 파라미터 타입은 인덱스 시그니처(`[key: string]: unknown`)를 가진 `BaseEventParams`를
확장합니다. 즉, 여기 문서화된 필드 외에 항상 추가 커스텀 필드를 넣을 수 있습니다.

## `Item` 타입

`Item`은 모든 이커머스 이벤트(`view_item`, `add_to_cart`, `purchase` 등)가 사용하는 공유
상품/아이템 구조입니다. GA4 아이템 스키마를 따릅니다. `item_id`와 `item_name`만 필수입니다.

```ts
import type { Item } from "@sunwjy/funnel-core";
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `item_id` | `string` | 예 | 아이템의 고유 식별자(예: SKU). |
| `item_name` | `string` | 예 | 아이템 이름. |
| `affiliation` | `string` | 아니요 | 상품 제휴처 또는 스토어 이름. |
| `coupon` | `string` | 아니요 | 아이템에 적용된 쿠폰 코드. |
| `discount` | `number` | 아니요 | 아이템에 연관된 할인 금액. |
| `index` | `number` | 아니요 | 목록에서 아이템의 인덱스/위치(0부터 시작). |
| `item_brand` | `string` | 아니요 | 아이템 브랜드. |
| `item_category` | `string` | 아니요 | 기본 카테고리. |
| `item_category2` | `string` | 아니요 | 2차 카테고리. |
| `item_category3` | `string` | 아니요 | 3차 카테고리. |
| `item_category4` | `string` | 아니요 | 4차 카테고리. |
| `item_category5` | `string` | 아니요 | 5차 카테고리. |
| `item_list_id` | `string` | 아니요 | 아이템이 속한 목록의 ID. |
| `item_list_name` | `string` | 아니요 | 아이템이 속한 목록의 이름. |
| `item_variant` | `string` | 아니요 | 아이템 변형(예: 색상, 사이즈). |
| `location_id` | `string` | 아니요 | 아이템에 연관된 물리적 위치 ID. |
| `price` | `number` | 아니요 | 아이템 단가. |
| `quantity` | `number` | 아니요 | 아이템 수량. |
| `promotion_id` | `string` | 아니요 | 아이템에 연관된 프로모션 ID. |
| `promotion_name` | `string` | 아니요 | 아이템에 연관된 프로모션 이름. |
| `creative_name` | `string` | 아니요 | 프로모션 크리에이티브 이름. |
| `creative_slot` | `string` | 아니요 | 프로모션 크리에이티브 슬롯. |

## 페이지 & 인게이지먼트

### `page_view`

페이지가 조회될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page_title` | `string` | 아니요 | 페이지 제목. |
| `page_location` | `string` | 아니요 | 페이지 전체 URL. |
| `page_referrer` | `string` | 아니요 | 이전 페이지 URL(리퍼러). |

### `share`

사용자가 콘텐츠를 공유할 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `method` | `string` | 아니요 | 공유 채널(예: `"twitter"`, `"email"`). |
| `content_type` | `string` | 아니요 | 공유된 콘텐츠 유형. |
| `item_id` | `string` | 아니요 | 공유된 콘텐츠 ID. |

## 검색

### `search`

사용자가 검색을 수행할 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `search_term` | `string` | 예 | 검색어 문자열. |

### `view_search_results`

사용자가 검색 결과를 볼 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `search_term` | `string` | 예 | 검색어 문자열. |
| `items` | `Item[]` | 아니요 | 검색 결과로 표시된 아이템. |

## 인증 & 리드

### `sign_up`

사용자가 가입 절차를 완료할 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `method` | `string` | 아니요 | 가입 방식(예: `"google"`, `"email"`). |

### `login`

사용자가 기존 계정에 로그인할 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `method` | `string` | 아니요 | 로그인 방식(예: `"google"`, `"email"`). |

### `generate_lead`

리드가 생성될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드(예: `"USD"`, `"KRW"`). |
| `value` | `number` | 아니요 | 리드의 금전적 가치. |

## 프로모션

### `view_promotion`

사용자에게 프로모션이 노출될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | `Item[]` | 아니요 | 프로모션에 포함된 아이템. |
| `promotion_id` | `string` | 아니요 | 프로모션 ID. |
| `promotion_name` | `string` | 아니요 | 프로모션 이름. |
| `creative_name` | `string` | 아니요 | 프로모션 크리에이티브 이름. |
| `creative_slot` | `string` | 아니요 | 프로모션 크리에이티브 슬롯. |
| `location_id` | `string` | 아니요 | 프로모션에 연관된 위치 ID. |

### `select_promotion`

사용자가 프로모션을 클릭하거나 선택할 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | `Item[]` | 아니요 | 프로모션에 포함된 아이템. |
| `promotion_id` | `string` | 아니요 | 프로모션 ID. |
| `promotion_name` | `string` | 아니요 | 프로모션 이름. |
| `creative_name` | `string` | 아니요 | 프로모션 크리에이티브 이름. |
| `creative_slot` | `string` | 아니요 | 프로모션 크리에이티브 슬롯. |
| `location_id` | `string` | 아니요 | 프로모션에 연관된 위치 ID. |

## 이커머스: 탐색

### `view_item_list`

상품 목록(예: 카테고리 페이지)이 조회될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | `Item[]` | 아니요 | 목록에 표시된 아이템. |
| `item_list_id` | `string` | 아니요 | 아이템 목록 ID. |
| `item_list_name` | `string` | 아니요 | 아이템 목록 이름. |

### `select_item`

목록에서 아이템이 선택될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | `Item[]` | 아니요 | 선택된 아이템. |
| `item_list_id` | `string` | 아니요 | 아이템을 선택한 목록의 ID. |
| `item_list_name` | `string` | 아니요 | 아이템을 선택한 목록의 이름. |

### `view_item`

상품 상세 페이지가 조회될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 아이템의 금전적 가치. |
| `items` | `Item[]` | 아니요 | 조회된 아이템. |

## 이커머스: 장바구니 & 위시리스트

### `add_to_wishlist`

아이템이 위시리스트에 추가될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 추가된 아이템의 총 가치. |
| `items` | `Item[]` | 아니요 | 위시리스트에 추가된 아이템. |

### `add_to_cart`

아이템이 장바구니에 추가될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 장바구니에 추가된 아이템의 총 가치. |
| `items` | `Item[]` | 아니요 | 장바구니에 추가된 아이템. |

### `remove_from_cart`

아이템이 장바구니에서 제거될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 장바구니에서 제거된 아이템의 총 가치. |
| `items` | `Item[]` | 아니요 | 장바구니에서 제거된 아이템. |

### `view_cart`

사용자가 장바구니를 볼 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 장바구니에 담긴 아이템의 총 가치. |
| `items` | `Item[]` | 아니요 | 장바구니에 담긴 아이템. |

## 이커머스: 결제 & 구매

### `begin_checkout`

결제 절차가 시작될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 총 결제 금액. |
| `coupon` | `string` | 아니요 | 적용된 쿠폰 코드. |
| `items` | `Item[]` | 아니요 | 결제에 포함된 아이템. |

### `add_shipping_info`

배송 정보가 제출될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 총 결제 금액. |
| `coupon` | `string` | 아니요 | 적용된 쿠폰 코드. |
| `shipping_tier` | `string` | 아니요 | 배송 등급(예: `"express"`, `"standard"`). |
| `items` | `Item[]` | 아니요 | 배송되는 아이템. |

### `add_payment_info`

결제 정보가 제출될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 총 결제 금액. |
| `coupon` | `string` | 아니요 | 적용된 쿠폰 코드. |
| `payment_type` | `string` | 아니요 | 결제 수단(예: `"credit_card"`, `"paypal"`). |
| `items` | `Item[]` | 아니요 | 구매되는 아이템. |

### `purchase`

구매가 완료될 때 전송됩니다. `transaction_id`는 GA4에서 **필수**이며, 대부분의 플랫폼이
구매 이벤트의 서버사이드 중복 제거에 사용하는 값입니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `transaction_id` | `string` | 예 | 고유 거래 식별자(GA4 필수). |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 총 구매 금액(배송비 및 세금 포함). |
| `coupon` | `string` | 아니요 | 적용된 쿠폰 코드. |
| `shipping` | `number` | 아니요 | 배송비. |
| `tax` | `number` | 아니요 | 세액. |
| `items` | `Item[]` | 아니요 | 구매된 아이템. |

### `refund`

환불이 처리될 때 전송됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currency` | `string` | 아니요 | 통화 코드. |
| `value` | `number` | 아니요 | 환불 금액. |
| `transaction_id` | `string` | 아니요 | 원본 거래 식별자. |
| `coupon` | `string` | 아니요 | 적용된 쿠폰 코드. |
| `shipping` | `number` | 아니요 | 환불된 배송비. |
| `tax` | `number` | 아니요 | 환불된 세액. |
| `items` | `Item[]` | 아니요 | 환불된 아이템. |

## 예제

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";

const funnel = new Funnel({ plugins: [createGA4Plugin()] });
funnel.initialize({ ga4: { measurementId: "G-XXXXXXXXXX" } });

// 아이템 한 개를 포함한 구매. 타입이 PurchaseParams + Item에 대해 검사됩니다.
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
  items: [{ item_id: "SKU-1", item_name: "Sneakers", price: 29000, quantity: 1 }],
});
```

## 함께 보기

- [`Funnel`](/ko/reference/funnel/): `track()`에서 이 스키마를 소비하는 디스패처.
- [`FunnelPlugin`](/ko/reference/funnel-plugin/): 플러그인이 각 이벤트를 받는 방식.
