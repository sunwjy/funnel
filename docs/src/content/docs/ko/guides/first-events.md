---
title: 첫 이벤트 추적
description: 이벤트 이름과 파라미터가 동작하는 방식, 그리고 가장 흔한 GA4 이벤트 둘러보기.
sidebar:
  order: 2
---

Funnel로 보내는 모든 이벤트는 두 부분으로 이루어집니다: **이름**(`page_view`나 `purchase` 같은
GA4 이벤트 이름)과 **params** 객체(해당 이벤트가 받는 파라미터)입니다. `track()`에 둘 다
넘깁니다:

```ts
funnel.track(eventName, params);
```

Funnel은 GA4를 기준 스키마로 쓰기 때문에, 아래의 이름과 파라미터는 GA4 표준입니다. TypeScript가
둘 다 자동완성해 줍니다. 이벤트 이름을 입력하는 순간 에디터가 어떤 파라미터가 유효한지 정확히
알게 됩니다.

:::tip[공짜로 얻는 타입 안전성]
`track()`은 완전히 타입이 지정되어 있습니다. `funnel.track("purchase", {})`라고 쓰면 TypeScript가
필수값 `transaction_id`가 빠졌다고 알려줍니다. 파라미터를 외우지 말고 자동완성에 기대세요.
:::

## 흔한 이벤트 둘러보기

가장 자주 쓰게 될 이벤트들과 실제 파라미터입니다.

### page_view

페이지(또는 라우트)가 조회될 때 전송합니다. 모든 파라미터가 선택입니다.

```ts
funnel.track("page_view", {
  page_title: "Home",
  page_location: window.location.href,
  page_referrer: document.referrer,
});
```

### sign_up

사용자가 가입을 완료할 때 전송합니다. `method`는 어떻게 가입했는지를 나타냅니다.

```ts
funnel.track("sign_up", { method: "google" });
```

### login

사용자가 기존 계정에 로그인할 때 전송합니다.

```ts
funnel.track("login", { method: "email" });
```

### search

사용자가 검색을 수행할 때 전송합니다. `search_term`은 **필수**입니다.

```ts
funnel.track("search", { search_term: "running shoes" });
```

### view_item

상품 상세 페이지가 조회될 때 전송합니다. 상품은 GA4 item 형태로 `items`에 담아 넘깁니다.

```ts
funnel.track("view_item", {
  currency: "KRW",
  value: 89000,
  items: [
    {
      item_id: "SHOE-001",
      item_name: "Classic Running Shoe",
      item_brand: "FunnelSports",
      item_category: "Sports/Shoes",
      price: 89000,
      quantity: 1,
    },
  ],
});
```

### add_to_cart

장바구니에 상품을 담을 때 전송합니다. `view_item`과 동일한 item 형태입니다.

```ts
funnel.track("add_to_cart", {
  currency: "KRW",
  value: 89000,
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

### begin_checkout

결제가 시작될 때 전송합니다. 장바구니 필드 외에 선택적 `coupon`을 받습니다.

```ts
funnel.track("begin_checkout", {
  currency: "KRW",
  value: 89000,
  coupon: "WELCOME10",
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

### purchase

구매가 완료될 때 전송합니다. `transaction_id`는 **필수**입니다. GA4가 요구하며, 대부분의
플랫폼이 구매의 서버사이드 중복 제거에 이 값을 씁니다.

```ts
funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 89000,
  shipping: 3000,
  tax: 0,
  items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
});
```

## GA4 `Item` 형태

이커머스 이벤트(`view_item`, `add_to_cart`, `begin_checkout`, `purchase` 등)는 `items` 배열을
가집니다. 각 item은 GA4 `Item` 스키마를 따릅니다. `item_id`와 `item_name`만 필수이고 나머지는
선택입니다:

```ts
{
  item_id: "SHOE-001",     // 필수 (예: SKU)
  item_name: "Classic Running Shoe", // 필수
  item_brand: "FunnelSports",
  item_category: "Sports/Shoes",
  item_variant: "Red / 270",
  price: 89000,
  quantity: 1,
  coupon: "WELCOME10",
  discount: 5000,
}
```

## 전체 이벤트 목록

Funnel은 GA4 이벤트 어휘 전체를 제공합니다. 위에서 다룬 것 외에도 다음을 쓸 수 있습니다:
`view_promotion`, `select_promotion`, `share`, `generate_lead`, `view_search_results`,
`view_item_list`, `select_item`, `add_to_wishlist`, `remove_from_cart`, `view_cart`,
`add_shipping_info`, `add_payment_info`, `refund`.

각각 고유한 타입의 파라미터를 가지며, 입력하는 동안 에디터가 정확한 형태를 보여줍니다. 모든
이벤트와 파라미터의 확정적인 목록은 [레퍼런스](/ko/reference/)를 보세요.

## 다음으로

- [여러 플러그인 연결](/ko/guides/multiple-plugins/): 하나의 이벤트를 여러 플랫폼으로 fan-out.
- [핵심 개념](/ko/guides/core-concepts/): 디스패처와 플러그인이 맞물리는 방식.
