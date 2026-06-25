---
title: Framework integration
description: Wire Funnel into React + Vite, Next.js (App Router), and vanilla HTML.
sidebar:
  order: 4
---

Funnel is framework-agnostic, but every framework has its own idea of "where setup runs." The
single pattern that works everywhere is a **shared singleton module**: create the `Funnel`
instance once in its own file and import it wherever you track events. This prevents
re-instantiation on re-renders and gives every component the same instance.

These examples mirror the apps in the repository's `examples/` directory.

## The shared singleton (all frameworks)

Put the instance in one module — e.g. `funnel.ts` (or `lib/funnel.ts`):

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

Then `import { funnel } from "./funnel"` anywhere you need it. Everything below is just *when*
to call `initialize()` for each framework.

## React + Vite

In a client-only SPA you can initialize at module load time. Read your IDs from `import.meta.env`
and call `initialize()` right in the singleton module:

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

// Client-only SPA: safe to initialize at module load.
funnel.initialize();
```

Track from components with a normal handler:

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

For the initial page view, track once when the app mounts:

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

Next.js renders on the server, so the rule is: **construct the Funnel anywhere, but only
`initialize()` and `track()` on the client.** You do that from a client component inside an
effect.

The singleton module is plain — no browser calls at import time:

```ts
// lib/funnel.ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
  debug: process.env.NODE_ENV === "development",
});

// Config map passed to initialize() from the client provider.
export const pluginConfigs: Record<string, Record<string, unknown>> = {
  ga4: { measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "" },
  "meta-pixel": { pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "" },
};
```

A client component initializes once and tracks `page_view` on every route change:

```tsx
// components/funnel-provider.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { funnel, pluginConfigs } from "@/lib/funnel";

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  // Initialize once. The ref guards against React StrictMode double-invoke.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    funnel.initialize(pluginConfigs);
  }, []);

  // Track a page_view on first render and every route change.
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

Wrap your app with it in the root layout (a server component):

```tsx
// app/layout.tsx
import { FunnelProvider } from "@/components/funnel-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FunnelProvider>{children}</FunnelProvider>
      </body>
    </html>
  );
}
```

:::note[Why this is safe during SSR]
The `funnel.ts` module loads on the server, but `initialize()` and `track()` only run inside
`useEffect`, which never executes during server rendering. On top of that, every client plugin
guards on `typeof window`, so even an accidental server-side call is a no-op. See
[SSR considerations](/guides/ssr/).
:::

To track events in deeper components (e.g. a product page), make a small client component:

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

## Vanilla HTML

With a bundler (Vite, esbuild, etc.) and no SSR, the singleton can construct, initialize, and
track all at module load:

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

Then wire up DOM listeners:

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

## Don't forget the platform base snippets

In every framework, Funnel calls `window.gtag`, `window.fbq`, and similar globals — it does not
load the platform SDKs for you. Make sure each platform's base snippet (the one from its
dashboard) is on the page before events fire. If a global isn't present, the matching plugin
simply no-ops.

## Where to go next

- [SSR considerations](/guides/ssr/) — why server rendering is always safe.
- [Adding multiple plugins](/guides/multiple-plugins/) — add more platforms to the singleton.
