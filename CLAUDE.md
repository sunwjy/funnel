# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

A unified marketing funnel event tracking library. Events follow the GA4 standard; each plugin transforms them into the target platform's native format (Meta Pixel, etc.). One `track()` call dispatches to all connected analytics tools.

## Commands

```bash
pnpm build        # Build all packages (Turborepo)
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint (Biome)
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Format (Biome)
pnpm test         # Run all tests (Vitest)
pnpm test:watch   # Run tests in watch mode
```

Single-package commands: `pnpm --filter @sunwjy/funnel-core build`

## Architecture

**Monorepo** (`packages/*`) with two packages:

- **`@sunwjy/funnel-core`** — `EventMap` type definitions (GA4-based), `FunnelPlugin` interface, `Funnel` dispatcher class, `EventContext` (auto-generated `eventId` for deduplication)
- **`@sunwjy/funnel-client`** — All client-side plugins consolidated into one package with subpath exports for tree-shaking (GA4, GTM, Meta Pixel, Meta Conversion API, Google Ads, TikTok Pixel, Kakao Pixel, Naver Ad, X Pixel, LinkedIn Insight, Mixpanel, Amplitude)

**Import styles:**
```ts
// Barrel import (tree-shakeable via sideEffects: false)
import { Funnel, createGA4Plugin, createMetaPixelPlugin } from "@sunwjy/funnel-client";

// Subpath import (guaranteed tree-shaking)
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
```

**Data flow:** `Funnel.track(event, params)` → generates `EventContext` with unique `eventId` → iterates all plugins with `plugin.track(event, params, context)` → each plugin transforms & sends. Plugins are error-isolated (one failure doesn't block others).

**Key design decisions:**
- GA4 is the canonical event schema; plugins map FROM it, never the reverse
- All client plugins must handle SSR (`typeof window` check before accessing globals)
- No runtime dependencies — plugins call browser globals (`gtag`, `fbq`) directly
- Dual ESM/CJS output via tsdown
- `@sunwjy/funnel-core` is shared between client and future `@sunwjy/funnel-server`
- Every `track()` call generates a unique `eventId` (via `crypto.randomUUID()`) in `EventContext`, enabling server-side deduplication (e.g., Meta CAPI)
- `FunnelPlugin.track` signature: `track(eventName, params, context: EventContext)` — all plugins receive context

## Testing

- Always write tests when adding or modifying code
- Colocate test files with source: `src/foo.ts` → `src/foo.test.ts`
- Vitest + jsdom environment
- Mock browser globals (`window.gtag`, `window.fbq`, `window.dataLayer`) with `vi.fn()`
- Ensure `pnpm test` passes before committing

## Code Style

- Biome: double quotes, semicolons always, 2-space indent, 100 char line width
- TypeScript strict mode with `verbatimModuleSyntax` (use `import type` for type-only imports)
