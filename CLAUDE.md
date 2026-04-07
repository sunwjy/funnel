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

Single-package commands: `pnpm --filter @funnel/core build`

## Architecture

**Monorepo** (`packages/*`) with four packages:

- **`@funnel/core`** — `EventMap` type definitions (GA4-based), `FunnelPlugin` interface, `Funnel` dispatcher class
- **`@funnel/plugin-ga4`** — Passes events through to `window.gtag`
- **`@funnel/plugin-gtm`** — Pushes GA4-format events to `window.dataLayer` for GTM containers
- **`@funnel/plugin-meta-pixel`** — Transforms GA4 events/params into Meta Pixel format via `window.fbq`

**Data flow:** `Funnel.track(event, params)` → iterates all plugins → each plugin transforms & sends. Plugins are error-isolated (one failure doesn't block others).

**Key design decisions:**
- GA4 is the canonical event schema; plugins map FROM it, never the reverse
- All plugins must handle SSR (`typeof window` check before accessing globals)
- No runtime dependencies — plugins call browser globals (`gtag`, `fbq`) directly
- Dual ESM/CJS output via tsdown

## Testing

- Always write tests when adding or modifying code
- Colocate test files with source: `src/foo.ts` → `src/foo.test.ts`
- Vitest + jsdom environment
- Mock browser globals (`window.gtag`, `window.fbq`, `window.dataLayer`) with `vi.fn()`
- Ensure `pnpm test` passes before committing

## Code Style

- Biome: double quotes, semicolons always, 2-space indent, 100 char line width
- TypeScript strict mode with `verbatimModuleSyntax` (use `import type` for type-only imports)
