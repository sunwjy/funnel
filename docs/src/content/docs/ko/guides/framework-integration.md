---
title: 프레임워크 연동
description: React + Vite, Next.js(App Router), 순수 HTML에 Funnel 연결하기.
sidebar:
  order: 4
---

Funnel은 프레임워크에 구애받지 않지만, 프레임워크마다 "설정 코드가 어디서 실행되는가"에 대한
생각이 다릅니다. 어디서나 통하는 단 하나의 패턴은 **공유 싱글턴 모듈**입니다: `Funnel` 인스턴스를
별도 파일에서 한 번만 만들고, 이벤트를 추적하는 곳마다 import합니다. 이렇게 하면 리렌더마다
재생성되는 것을 막고, 모든 컴포넌트가 동일한 인스턴스를 공유합니다.

아래 예제들은 저장소의 `examples/` 디렉터리에 있는 앱을 그대로 반영합니다.

## 공유 싱글턴 (모든 프레임워크 공통)

인스턴스를 한 모듈에 둡니다 — 예: `funnel.ts`(또는 `lib/funnel.ts`):

```ts
// funnel.ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: import.meta.env?.DEV ?? false,
});
```

그런 다음 필요한 곳에서 `import { funnel } from "./funnel"` 하면 됩니다. 아래 내용은 프레임워크별로
*언제* `initialize()`를 호출하느냐의 차이일 뿐입니다.

## React + Vite

클라이언트 전용 SPA에서는 모듈 로드 시점에 초기화할 수 있습니다. `import.meta.env`에서 ID를 읽고
싱글턴 모듈에서 바로 `initialize()`를 호출하세요:

```ts
// src/funnel.ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "G-XXXXXXXXXX";
const metaPixelId = import.meta.env.VITE_META_PIXEL_ID ?? "0000000000";

export const funnel = new Funnel({
  plugins: [
    createGA4Plugin({ measurementId: ga4Id }),
    createMetaPixelPlugin({ pixelId: metaPixelId }),
  ],
});

// 클라이언트 전용 SPA: 모듈 로드 시점 초기화가 안전합니다.
funnel.initialize();
```

컴포넌트에서는 일반 핸들러로 추적합니다:

```tsx
// src/components/ProductList.tsx
import { funnel } from "../funnel";

export function ProductList({ products }) {
  return products.map((p) => (
    <button
      key={p.item_id}
      type="button"
      onClick={() =>
        funnel.track("add_to_cart", {
          currency: "KRW",
          value: p.price,
          items: [p],
        })
      }
    >
      Add to cart
    </button>
  ));
}
```

초기 페이지뷰는 앱이 마운트될 때 한 번 추적합니다:

```tsx
// src/App.tsx
import { useEffect } from "react";
import { funnel } from "./funnel";

export function App() {
  useEffect(() => {
    funnel.track("page_view", {
      page_title: document.title,
      page_location: window.location.href,
    });
  }, []);

  // ...
}
```

## Next.js (App Router)

Next.js는 서버에서 렌더링하므로 규칙은 이렇습니다: **Funnel은 어디서든 생성하되,
`initialize()`와 `track()`은 클라이언트에서만 호출한다.** 이는 클라이언트 컴포넌트의 effect
안에서 처리합니다.

싱글턴 모듈은 단순합니다 — import 시점에 브라우저 호출이 없습니다:

```ts
// lib/funnel.ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: process.env.NODE_ENV === "development",
});

// 클라이언트 프로바이더에서 initialize()에 넘길 설정 맵.
export const pluginConfigs: Record<string, Record<string, unknown>> = {
  ga4: { measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "" },
  "meta-pixel": { pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "" },
};
```

클라이언트 컴포넌트가 한 번 초기화하고, 라우트가 바뀔 때마다 `page_view`를 추적합니다:

```tsx
// components/funnel-provider.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { funnel, pluginConfigs } from "@/lib/funnel";

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  // 한 번만 초기화. ref가 React StrictMode 이중 실행을 가드합니다.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    funnel.initialize(pluginConfigs);
  }, []);

  // 최초 렌더와 라우트 전환마다 page_view 추적.
  useEffect(() => {
    funnel.track("page_view", {
      page_title: typeof document !== "undefined" ? document.title : undefined,
      page_location:
        typeof window !== "undefined" ? `${window.location.origin}${pathname}` : pathname,
    });
  }, [pathname]);

  return <>{children}</>;
}
```

루트 레이아웃(서버 컴포넌트)에서 앱을 감쌉니다:

```tsx
// app/layout.tsx
import { FunnelProvider } from "@/components/funnel-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <FunnelProvider>{children}</FunnelProvider>
      </body>
    </html>
  );
}
```

:::note[SSR에서 안전한 이유]
`funnel.ts` 모듈은 서버에서 로드되지만, `initialize()`와 `track()`은 `useEffect` 안에서만
실행되며 — 서버 렌더링 중에는 절대 실행되지 않습니다. 게다가 모든 클라이언트 플러그인은
`typeof window`로 가드하므로, 실수로 서버에서 호출되더라도 no-op입니다.
[SSR 주의사항](/ko/guides/ssr/)을 보세요.
:::

더 깊은 컴포넌트(예: 상품 페이지)에서 이벤트를 추적하려면 작은 클라이언트 컴포넌트를 만드세요:

```tsx
// app/product/[id]/product-events.tsx
"use client";

import { useEffect } from "react";
import { funnel } from "@/lib/funnel";

export function ProductEvents({ product }) {
  useEffect(() => {
    funnel.track("view_item", {
      currency: "KRW",
      value: product.price,
      items: [product],
    });
  }, [product]);

  return null;
}
```

## 순수 HTML

번들러(Vite, esbuild 등)를 쓰고 SSR이 없다면, 싱글턴이 모듈 로드 시점에 생성·초기화·추적을 모두
할 수 있습니다:

```ts
// src/funnel.ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [
    createGA4Plugin({ measurementId: "G-XXXXXXXXXX" }),
    createMetaPixelPlugin({ pixelId: "1234567890" }),
  ],
});

funnel.initialize();
```

그다음 DOM 리스너를 연결합니다:

```ts
// src/main.ts
import { funnel } from "./funnel";

funnel.track("page_view", {
  page_title: document.title,
  page_location: window.location.href,
});

document.getElementById("btn-add-to-cart")?.addEventListener("click", () => {
  funnel.track("add_to_cart", {
    currency: "KRW",
    value: 89000,
    items: [{ item_id: "SHOE-001", item_name: "Classic Running Shoe", price: 89000, quantity: 1 }],
  });
});
```

## 플랫폼 기본 스니펫을 잊지 마세요

어느 프레임워크든 Funnel은 `window.gtag`, `window.fbq` 같은 글로벌을 호출합니다 — 플랫폼 SDK를
대신 로드해 주지는 않습니다. 이벤트가 발생하기 전에 각 플랫폼의 기본 스니펫(대시보드에서 받는
것)이 페이지에 있는지 확인하세요. 글로벌이 없으면 해당 플러그인은 단순히 no-op으로 동작합니다.

## 다음으로

- [SSR 주의사항](/ko/guides/ssr/) — 서버 렌더링이 항상 안전한 이유.
- [여러 플러그인 연결](/ko/guides/multiple-plugins/) — 싱글턴에 플랫폼을 더 추가하기.
