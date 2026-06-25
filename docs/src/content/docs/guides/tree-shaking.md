---
title: Tree-shaking & imports
description: Barrel vs. subpath imports, sideEffects, and how to keep your bundle minimal.
sidebar:
  order: 7
---

Funnel ships adapters for many platforms, but you only pay for the ones you use. With the right
imports, a bundler drops every plugin you didn't include. This page explains how to keep your
bundle small.

## Two ways to import

There are two valid import styles, and both are tree-shakeable:

```ts
// 1. Barrel import: everything from the package root.
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// 2. Subpath import: each plugin from its own entry point.
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
```

Both produce the same runtime behavior. The difference is how aggressively your bundler can prune
unused code.

## `sideEffects: false` makes the barrel safe

`@sunwjy/funnel-client` declares `"sideEffects": false` in its `package.json`. This tells bundlers
(webpack, Rollup, esbuild, Vite, etc.) that importing a module has no side effects, so any export
you don't actually use can be safely removed.

That means even a **barrel import** is tree-shaken: importing `createGA4Plugin` from the root
won't drag in the TikTok, Kakao, or LinkedIn plugins if you never reference them.

```ts
// Only Funnel + GA4 end up in the bundle, even though the barrel exposes everything.
import { Funnel, createGA4Plugin } from "@sunwjy/funnel-client";

export const funnel = new Funnel({ plugins: [createGA4Plugin()] });
```

## Subpath imports: guaranteed isolation

Subpath imports go one step further: they point the bundler directly at a single plugin's entry
point, so there's no chance of pulling in siblings even if your bundler's tree-shaking is
imperfect or disabled:

```ts
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";
```

Every plugin has its own subpath. The available subpaths are:

`ga4`, `gtm`, `sgtm`, `meta-pixel`, `meta-conversion-api`, `google-ads`, `tiktok-pixel`,
`kakao-pixel`, `naver-ad`, `x-pixel`, `linkedin-insight`, `mixpanel`, `amplitude`, `toss-ads`,
`reddit-pixel`, `daangn-ads`, `pinterest-tag`.

Use them like `@sunwjy/funnel-client/<subpath>`.

## Which should I use?

- **Barrel import**: convenient, fewer import lines, and tree-shakes correctly thanks to
  `sideEffects: false`. A good default for most apps with a modern bundler.
- **Subpath imports**: the safest choice when you want a guarantee, or when working with a
  toolchain whose tree-shaking you don't fully trust. Slightly more verbose.

Either way, the rule is the same: **only import the plugins you actually register.** An unused
`createXPlugin` import is the only thing that adds weight.

:::tip[Verify your bundle]
If you're optimizing, run your bundler's analyzer (e.g. `rollup-plugin-visualizer`,
`vite-bundle-visualizer`, or `webpack-bundle-analyzer`) and confirm only the plugins you use
appear. You shouldn't see platforms you never imported.
:::

## Where to go next

- [Adding multiple plugins](/guides/multiple-plugins/): how the imports come together.
- [Core concepts](/guides/core-concepts/): what each plugin actually does.
