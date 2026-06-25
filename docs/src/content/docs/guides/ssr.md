---
title: SSR considerations
description: Why every client plugin guards on typeof window, and how to use Funnel safely during server rendering.
sidebar:
  order: 6
---

If you use Next.js, Remix, Astro, or any framework that renders on the server, the worry is
always the same: "will this analytics code crash the server render by touching `window`?" With
Funnel, the answer is no. This page explains why, and the one rule you need to follow.

## Every client plugin guards on `typeof window`

Browser analytics SDKs live on globals like `window.gtag`, `window.fbq`, or `window.ttq`. Those
globals don't exist during server rendering. Every client plugin therefore checks for the
browser before touching anything:

```ts
// inside each plugin's track()
track(eventName, params, context) {
  if (typeof window === "undefined" || !window.fbq) {
    return; // SSR or SDK not loaded yet → no-op, no error
  }
  // ...safe to call window.fbq here
}
```

The same guard applies to `initialize()`, `setUser()`, and `setConsent()`. The practical result:
**a plugin called during SSR does nothing and throws nothing.** It silently no-ops until it runs
in a real browser with the SDK present.

## You can construct the Funnel during SSR

Because of those guards, importing your singleton module and constructing `new Funnel({...})` on
the server is completely safe. The constructor just stores the plugin list and doesn't touch any
browser global. So this module is fine to import from server components:

```ts
// lib/funnel.ts (safe to import on the server)
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});
```

## The one rule: initialize on the client

Even though plugins no-op on the server, there's no reason to call `initialize()` or `track()`
there, as it would do nothing useful. So the rule is: **construct anywhere, initialize and
track on the client.**

In React-based frameworks, "on the client" means inside an effect, which never runs during
server rendering:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { funnel, pluginConfigs } from "@/lib/funnel";

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    funnel.initialize(pluginConfigs); // runs only in the browser
  }, []);

  return <>{children}</>;
}
```

This is exactly the pattern in the [Next.js framework integration](/guides/framework-integration/)
guide.

## No errors during server render

Putting it together, here's what happens across a server render and client hydration:

1. **Server render:** `funnel.ts` is imported and `new Funnel(...)` runs. No browser globals are
   touched. No `initialize()` or `track()` fires (they're inside effects). Nothing throws.
2. **Client hydration:** the effect runs, `initialize()` boots the plugins, and `track()` calls
   now reach the real `window.gtag` / `window.fbq`.

If a `track()` somehow runs before the SDK has loaded, the `typeof window`/SDK guard makes it a
no-op rather than an error. You don't lose the event, because [events tracked before
`initialize()` are queued and replayed](/guides/core-concepts/).

:::tip[The CAPI and sGTM plugins too]
The server-side-oriented plugins (`meta-conversion-api`, `sgtm`) guard the same way: they no-op
when `typeof window === "undefined"` or when no `endpoint` is configured, so adding them never
breaks SSR.
:::

## Where to go next

- [Framework integration](/guides/framework-integration/): the concrete Next.js setup.
- [Core concepts](/guides/core-concepts/): the pre-initialize event queue.
