# Funnel

[![CI](https://github.com/sunwjy/funnel/actions/workflows/ci.yml/badge.svg)](https://github.com/sunwjy/funnel/actions/workflows/ci.yml)
[![npm: funnel-client](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-client?label=funnel-client)](https://www.npmjs.com/package/@sunwjy/funnel-client)
[![npm: funnel-core](https://img.shields.io/npm/v/%40sunwjy%2Ffunnel-core?label=funnel-core)](https://www.npmjs.com/package/@sunwjy/funnel-core)
[![bundle size](https://deno.bundlejs.com/badge?q=%40sunwjy%2Ffunnel-client)](https://bundlejs.com/?q=%40sunwjy%2Ffunnel-client)
[![license](https://img.shields.io/npm/l/%40sunwjy%2Ffunnel-client)](./LICENSE)

English | [한국어](./README.ko.md)

A library that sends key marketing funnel events to all connected analytics tools through a
single interface. Events follow the GA4 standard; each plugin transforms them into the target
tool's native format, so one `track()` call reaches GA4, Meta, TikTok, and more.

## Packages

| Package | Description |
|---------|-------------|
| `@sunwjy/funnel-core` | Event types, plugin interface, `Funnel` class, `EventContext` (auto-generated `eventId`) |
| `@sunwjy/funnel-client` | All client-side plugins (17 platforms) + a re-export of everything in core |

## Installation

```bash
npm install @sunwjy/funnel-client
# or: pnpm add @sunwjy/funnel-client
# or: yarn add @sunwjy/funnel-client
```

That's all you need. `@sunwjy/funnel-core` is re-exported from `@sunwjy/funnel-client`, so the
`Funnel` class and every event type come with this single install.

## Quickstart

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import { createMetaPixelPlugin } from "@sunwjy/funnel-client/meta-pixel";

const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});

funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});

// One call → every connected plugin, each in its native format
funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });
```

Funnel calls the platform globals (`window.gtag`, `window.fbq`, …) but does not load them.
Add each platform's base snippet as usual. See the
[5-minute Quickstart](./docs/src/content/docs/start-here/quickstart.md) for the full walkthrough.

## Documentation

Full, beginner-oriented docs (English + 한국어) live in [`docs/`](./docs) and will be published
at **https://funnel-docs.netlify.app** once deployed.

- **Start here**: [What is Funnel?](./docs/src/content/docs/start-here/what-is-funnel.md) ·
  [Installation](./docs/src/content/docs/start-here/installation.md) ·
  [Quickstart](./docs/src/content/docs/start-here/quickstart.md)
- **Guides**: [core concepts, framework integration, server-side dedup, SSR, tree-shaking](./docs/src/content/docs/guides/)
- **Plugins**: [setup pages for all 17 platforms](./docs/src/content/docs/plugins/)
- **Reference**: [EventMap, Funnel, FunnelPlugin, EventContext](./docs/src/content/docs/reference/)

한국어 문서는 [`docs/src/content/docs/ko/`](./docs/src/content/docs/ko/)에 있습니다.

## Examples

Three standalone examples live in [`examples/*`](./examples). Each is a pnpm workspace package
that references the library via `workspace:*`, so it always reflects the current source.

| Path | Stack | Run |
|------|-------|-----|
| `examples/vanilla-html` | Vite + vanilla TS | `pnpm --filter @repo/example-vanilla-html dev` |
| `examples/react-vite` | React 19 + Vite | `pnpm --filter @repo/example-react-vite dev` |
| `examples/nextjs` | Next.js 15 App Router | `pnpm --filter @repo/example-nextjs dev` |

By default all examples run in placeholder / log-demo mode. No real platform IDs required.

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build all packages
pnpm typecheck   # Run type checks
pnpm lint        # Run linter
pnpm test        # Run tests
```

## Tech stack

- **Monorepo**: pnpm + Turborepo
- **Bundler**: tsdown (ESM + CJS dual build with `.d.ts` generation)
- **Docs**: Astro Starlight (bilingual, deployed on Netlify)
- **Lint/Format**: Biome
- **TypeScript**: strict mode, `verbatimModuleSyntax`
