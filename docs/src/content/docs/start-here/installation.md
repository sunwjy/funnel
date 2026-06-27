---
title: Installation
description: Install Funnel with your package manager.
sidebar:
  order: 2
---

Funnel ships as two packages. For most apps you only need **`@sunwjy/funnel-client`**, which
re-exports everything from the core package, so a single install gives you the `Funnel` class,
all event types, and every client-side plugin.

import { Tabs, TabItem } from '@astrojs/starlight/components';

```bash
# pnpm
pnpm add @sunwjy/funnel-client

# npm
npm install @sunwjy/funnel-client

# yarn
yarn add @sunwjy/funnel-client
```

## Which package do I need?

| Package | When to use it |
| --- | --- |
| `@sunwjy/funnel-client` | Browser apps. Includes the `Funnel` class (re-exported from core) **and** all client plugins. Start here. |
| `@sunwjy/funnel-core` | Shared types and the dispatcher only. Useful for server code or custom plugins that should not pull in the client bundle. |

## Two ways to import

```ts
// Barrel import: convenient, fully tree-shakeable (sideEffects: false)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// Subpath import: guarantees only the plugin you name is bundled
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
```

Both styles tree-shake. Use whichever you prefer; the subpath form makes the dependency
explicit per plugin.

## Load the platform SDKs

Funnel calls the analytics globals (`window.gtag`, `window.fbq`, …) but does **not** load
them for you. Add each platform's base snippet to your site as usual before initializing the
matching plugin. The per-platform [plugin pages](/plugins/) show exactly which global each
one needs.

## Next step

You're ready. [Send your first events in 5 minutes](/start-here/quickstart/).
