# Contributing to Funnel

Thanks for your interest in contributing! This guide covers everything you need to set up the project, make changes, and get them merged.

For an overview of what the library does and how it's designed, start with the [README](./README.md). Architecture notes and design decisions also live in [CLAUDE.md](./CLAUDE.md).

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Repository Layout](#repository-layout)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Adding a New Plugin](#adding-a-new-plugin)
- [Commit Conventions](#commit-conventions)
- [Changesets](#changesets)
- [Pull Request Process](#pull-request-process)
- [Continuous Integration](#continuous-integration)
- [Releases](#releases)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Code of Conduct

Be respectful and constructive. Assume good intent, keep discussions focused on the work, and help reviewers help you by explaining the *why* behind your changes.

## Prerequisites

- **Node.js** — the version pinned in [`.nvmrc`](./.nvmrc) (currently `22.x`). The build tooling (`tsdown`/rolldown) requires Node 22+, even though the published packages support `node >=18` at runtime. With [`nvm`](https://github.com/nvm-sh/nvm) or [`fnm`](https://github.com/Schniz/fnm), run `nvm use` / `fnm use` in the repo root to match it.
- **pnpm** — this repo uses the version pinned in `package.json` (`packageManager` field, currently `pnpm@10.33.0`). The easiest way to get the exact version is [Corepack](https://nodejs.org/api/corepack.html):

  ```bash
  corepack enable
  ```

  Corepack will then transparently use the pinned pnpm version for every command.

This is a pnpm workspace + Turborepo monorepo. There are **no other global tools** to install.

## Getting Started

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/funnel.git
cd funnel

# 2. Match the Node version
nvm use            # or: fnm use

# 3. Install dependencies (also links workspace packages + examples)
pnpm install

# 4. Verify your environment — this is exactly what CI runs
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```

If all four commands pass, you're ready to make changes.

## Repository Layout

```
funnel/
├── packages/
│   ├── core/      # @sunwjy/funnel-core — EventMap types, FunnelPlugin interface, Funnel dispatcher, EventContext
│   └── client/    # @sunwjy/funnel-client — all client-side plugins (subpath exports per platform)
├── examples/      # Standalone demo apps (private, workspace-linked) — vanilla-html, react-vite, nextjs
├── .changeset/    # Changeset config + pending changesets
└── .github/       # CI and release workflows
```

- **`@sunwjy/funnel-core`** is the canonical schema. GA4 is the source of truth; everything maps *from* GA4, never the reverse. It's shared by the client package and a future `@sunwjy/funnel-server`.
- **`@sunwjy/funnel-client`** holds every browser plugin in one package with per-platform subpath exports (`@sunwjy/funnel-client/ga4`, etc.) so consumers tree-shake what they don't use.
- **`examples/*`** are `private: true` and reference the library via `workspace:*`, so they always reflect the current source. They're excluded from changesets/releases but **are** verified in CI (`pnpm build && pnpm typecheck`).

## Development Workflow

All commands run from the repo root and operate across the whole workspace via Turborepo:

```bash
pnpm build          # Build all packages (tsdown → ESM + CJS + .d.ts)
pnpm typecheck      # Type-check all packages (tsc --noEmit)
pnpm lint           # Lint + format check (Biome)
pnpm lint:fix       # Auto-fix lint/format issues
pnpm format         # Format only (Biome)
pnpm test           # Run all tests once (Vitest)
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage (what CI runs)
```

To scope a command to a single package, use a pnpm filter:

```bash
pnpm --filter @sunwjy/funnel-core build
pnpm --filter @sunwjy/funnel-client test     # (tests run from the root Vitest config)
```

To run an example app locally:

```bash
pnpm --filter @examples/vanilla-html dev
pnpm --filter @examples/react-vite dev
pnpm --filter @examples/nextjs dev
```

Examples run in **placeholder / log-demo mode** by default — no real platform IDs needed. A debug plugin logs every event (including its `eventId`) to the console and an on-screen panel. To send real events, copy `.env.example` to `.env.local` inside the example directory.

> **Build order matters.** `typecheck` and `test` depend on `^build` in `turbo.json`, so the client package needs `funnel-core`'s `dist/` types. Turbo handles this automatically — just run the root scripts.

## Code Style

Formatting and linting are enforced by [Biome](https://biomejs.dev/). Run `pnpm lint:fix` before committing; CI fails on any unformatted or lint-flagged code.

- **Double quotes**, **semicolons always**, **2-space indentation**, **100-character line width**
- Imports are auto-organized (Biome `organizeImports`)
- **TypeScript strict mode** with `verbatimModuleSyntax` — use `import type { … }` for type-only imports, otherwise the build fails
- No runtime dependencies in the plugins — call browser globals (`gtag`, `fbq`, …) directly
- **Always guard for SSR**: check `typeof window === "undefined"` (and that the global exists) before touching browser APIs, so plugins are safe to import in Node/SSR contexts

## Testing

**Write tests for everything you add or change.** A PR that changes behavior without tests will be asked to add them.

- **Colocate** test files with source: `src/foo.ts` → `src/foo.test.ts`
- Tests run on **Vitest** with the **jsdom** environment (config in [`vitest.config.ts`](./vitest.config.ts), which globs `packages/*/src/**/*.test.ts`)
- **Mock browser globals** (`window.gtag`, `window.fbq`, `window.dataLayer`, etc.) with `vi.fn()` and assert on the calls
- Cover the **SSR path** — verify the plugin no-ops when `window` is undefined
- For async behavior (e.g. PII hashing), prefer `vi.waitFor` over fixed timeouts to avoid flakes
- Ensure `pnpm test` passes locally before opening a PR

## Adding a New Plugin

New analytics integrations are the most common contribution. Plugins live in `packages/client/src/plugins/<name>/` and implement the [`FunnelPlugin`](./packages/core/src/plugin.ts) interface via a `createXxxPlugin()` factory. Use an existing plugin like [`ga4`](./packages/client/src/plugins/ga4/index.ts) as a template.

### 1. Create the plugin

`packages/client/src/plugins/<name>/index.ts`:

```ts
import type {
  ConsentState,
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-core";

declare global {
  interface Window {
    // Declare the platform's global (e.g. the pixel snippet's function)
    myTag: (...args: unknown[]) => void;
  }
}

/** Typed factory config — validated at compile time at the call site. */
export interface MyPluginConfig {
  pixelId?: string;
  /** Drop events until the relevant consent signal is granted. */
  consentRequired?: boolean;
}

export function createMyPlugin(factoryConfig?: MyPluginConfig): FunnelPlugin {
  return {
    name: "my-plugin", // unique; also the key for runtime config in initialize()

    initialize(config: Record<string, unknown>): void {
      // Shallow-merge: runtime config from Funnel.initialize() wins key-by-key.
      const { pixelId } = { ...factoryConfig, ...(config as MyPluginConfig) };
      if (pixelId && typeof window !== "undefined" && window.myTag) {
        window.myTag("init", pixelId);
      }
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      if (typeof window === "undefined" || !window.myTag) return;
      // Map the canonical GA4 event to the platform's native event here.
      // Forward context.eventId wherever the platform supports deduplication.
      window.myTag("track", eventName, { ...params, event_id: context.eventId });
    },

    // Optional — implement only if the platform supports it.
    setUser(_properties: UserProperties): void {},
    resetUser(): void {},
    setConsent(_state: ConsentState): void {},
  };
}
```

Key conventions to follow:

- **Map *from* GA4.** GA4 events/params are the canonical schema; transform them into the platform's native event names and shapes. Document the mapping (see existing plugin tables in the README).
- **SSR-safe.** Every method that touches a browser global must early-return when `window` is unavailable.
- **Deduplication.** If the platform has a Conversions/server API, forward `context.eventId` as its dedup key (e.g. `eventID`, `event_id`, `conversionId`).
- **Consent.** Either map Consent Mode v2 signals via `setConsent`, or support a `consentRequired` config flag that gates dispatch until the relevant signal (`ad_storage` for ad platforms, `analytics_storage` for analytics tools) is granted. The shared helpers in `packages/client/src/internal/` (`consent.ts`, `transport.ts`, `analytics-shared.ts`) exist for this.
- **Optional methods** (`setUser`, `resetUser`, `setConsent`) — omit them entirely if the platform has no such capability rather than implementing empty stubs.

### 2. Add a colocated test

Create `packages/client/src/plugins/<name>/index.test.ts` covering event mapping, the SSR no-op path, and consent/user behavior. See [`meta-pixel/index.test.ts`](./packages/client/src/plugins/meta-pixel/index.test.ts) for a thorough example.

### 3. Wire up exports

Three files register the new plugin — keep them in sync:

1. **Barrel export** — add to [`packages/client/src/index.ts`](./packages/client/src/index.ts):
   ```ts
   export { createMyPlugin } from "./plugins/my-plugin/index.js";
   ```
2. **Build entry** — add to `entry` in [`packages/client/tsdown.config.ts`](./packages/client/tsdown.config.ts):
   ```ts
   "plugins/my-plugin": "src/plugins/my-plugin/index.ts",
   ```
3. **Subpath export** — add to `exports` in [`packages/client/package.json`](./packages/client/package.json), mirroring the existing entries (both `import` and `require`, each with `types` + `default`):
   ```jsonc
   "./my-plugin": {
     "import": { "types": "./dist/plugins/my-plugin.d.mts", "default": "./dist/plugins/my-plugin.mjs" },
     "require": { "types": "./dist/plugins/my-plugin.d.cts", "default": "./dist/plugins/my-plugin.cjs" }
   }
   ```
   Also add the platform to the package `keywords` and the `description` if appropriate.

### 4. Update docs and examples

- Add the plugin (and its event mapping table) to the [README](./README.md).
- If a public API changed, **update all three examples** so they stay consistent and keep passing CI (`pnpm build && pnpm typecheck`).

### 5. Verify

```bash
pnpm lint:fix && pnpm build && pnpm typecheck && pnpm test
```

Then [add a changeset](#changesets).

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Use a type prefix, an optional scope, and an imperative summary:

```
<type>(<scope>): <summary>
```

Common types in this repo: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `chore`. Scopes are usually a package or plugin name (`core`, `client`, `ga4`, `gtm`, `meta-capi`, `ci`, …). Append `!` for a breaking change (e.g. `feat(naver-ad)!: migrate to new wcs.trans API`).

Examples from the history:

```
feat(core): queue events tracked before initialize
fix(gtm): keep custom params outside the ecommerce object
perf(meta-capi): hash PII once per setUser and pin synthesized fbc
docs: refresh READMEs for v0.2 APIs
```

Commit messages describe *what changed and why*; the user-facing changelog comes from [changesets](#changesets), not the commit log.

## Changesets

Versioning and changelogs are managed with [Changesets](https://github.com/changesets/changesets). **Any change to a published package (`@sunwjy/funnel-core` or `@sunwjy/funnel-client`) needs a changeset.**

After making your change, run:

```bash
pnpm changeset
```

This prompts you to:

1. Select which packages changed.
2. Choose a [semver](https://semver.org/) bump:
   - **patch** — bug fixes, internal changes, docs in code
   - **minor** — new backward-compatible features (e.g. a new plugin)
   - **major** — breaking changes to a public API
3. Write a summary — this becomes the changelog entry, so write it for **consumers** of the library.

Commit the generated `.changeset/*.md` file along with your code.

Notes:

- The two packages are **linked** (`@sunwjy/funnel-core` + `@sunwjy/funnel-client` version together), so they bump in lockstep.
- The **`examples/*` packages are ignored** by changesets — never add a changeset for them.
- Changes that don't affect published output (CI config, repo tooling, the examples, this guide) **don't** need a changeset.

## Pull Request Process

1. **Branch from `main`** in your fork. Use a descriptive branch name (e.g. `feat/snapchat-pixel`, `fix/gtm-ecommerce-reset`).
2. Make your change with **tests** and, if it touches a published package, a **changeset**.
3. Run the full local check — it mirrors CI:
   ```bash
   pnpm lint && pnpm build && pnpm typecheck && pnpm test:coverage
   ```
4. Open a PR against `sunwjy/funnel`'s `main`. In the description, explain *what* and *why*, and link any related issue.
5. Make sure **CI is green**. Address review feedback by pushing additional commits to the same branch.
6. A maintainer will merge once CI passes and the change is approved. PRs are typically squash/merge-committed.

Keep PRs focused — one logical change per PR is much easier to review than a large mixed bag.

## Continuous Integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every pull request and on pushes to `main`. It installs with `--frozen-lockfile` (so commit an up-to-date `pnpm-lock.yaml`) and runs, in order:

1. **Lint** — `pnpm lint`
2. **Build** — `pnpm build`
3. **Typecheck** — `pnpm typecheck`
4. **Test with coverage** — `pnpm test:coverage`

On pull requests, a coverage report is posted as a comment. All steps must pass before a PR can merge.

## Releases

Releases are handled by maintainers via the [Changesets GitHub action](https://github.com/changesets/action) in [`.github/workflows/release.yml`](./.github/workflows/release.yml). The workflow opens (or updates) a "Version Packages" PR that consumes pending changesets, bumps versions, and updates changelogs; merging it publishes to npm.

> **Note:** automated publishing is currently **disabled** (the workflow is `workflow_dispatch`-only) until the `NPM_TOKEN` secret is configured. As a contributor you don't need to run a release — just include a changeset and a maintainer takes it from there.

## Reporting Issues

Found a bug or have a feature request? Open an issue at <https://github.com/sunwjy/funnel/issues>. For bug reports, please include:

- What you expected to happen vs. what actually happened
- A minimal reproduction (code snippet, affected plugin, relevant config)
- Library version, bundler, and runtime environment (browser/SSR)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE) that covers this project.
