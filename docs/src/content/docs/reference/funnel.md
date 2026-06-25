---
title: Funnel
description: "The dispatcher class: configure plugins, initialize, and track events."
sidebar:
  order: 2
---

`Funnel` is the dispatcher at the centre of the library. You create one instance, register your
plugins, initialize them with their IDs, and then call `track()`. Every `track()` call fans out
to **all** registered plugins, and each plugin failure is isolated so one broken plugin never
blocks the others.

```ts
import { Funnel } from "@sunwjy/funnel-client";
// or: import { Funnel } from "@sunwjy/funnel-core";
```

Both `@sunwjy/funnel-client` and `@sunwjy/funnel-core` export `Funnel`; the client package
re-exports it for convenience so you can import everything from one place.

## `FunnelConfig`

The object you pass to `new Funnel(config)`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `plugins` | `FunnelPlugin[]` | Yes | List of plugins to register. |
| `debug` | `boolean` | No | When `true`, prints debug logs to the console. Defaults to `false`. |
| `onError` | `(error: unknown, context: FunnelErrorContext) => void` | No | Called when any plugin throws during a lifecycle method. Replaces the default `console.error`. |

### `FunnelErrorContext`

Passed as the second argument to `onError` so you can tell which plugin and lifecycle phase
failed.

| Field | Type | Description |
| --- | --- | --- |
| `plugin` | `string` | Plugin name where the error originated. |
| `phase` | `"initialize" \| "track" \| "setUser" \| "resetUser" \| "setConsent"` | Lifecycle method that threw. |
| `eventName` | `EventName` (optional) | Event name, present only when `phase === "track"`. |

Errors are always isolated: one plugin throwing never blocks the others. Providing `onError`
just lets you forward those errors somewhere (Sentry, Bugsnag, etc.) instead of logging them.

```ts
import { Funnel } from "@sunwjy/funnel-client";
import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
import * as Sentry from "@sentry/browser";

const funnel = new Funnel({
  plugins: [createGA4Plugin()],
  debug: true,
  onError(error, context) {
    Sentry.captureException(error, { extra: { ...context } });
  },
});
```

## `new Funnel(config)`

Creates a new instance. The constructor only stores configuration. No plugin is touched until
you call [`initialize()`](#initializepluginconfigs).

```ts
const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin()],
});
```

## `initialize(pluginConfigs?)`

```ts
initialize(pluginConfigs?: Record<string, Record<string, unknown>>): void
```

Initializes every registered plugin. `pluginConfigs` is a map keyed by **plugin name**
(`plugin.name`). The value for each key is passed to that plugin's `initialize()`. A plugin
with no entry receives an empty object (`{}`).

```ts
funnel.initialize({
  ga4: { measurementId: "G-XXXXXXXXXX" },
  "meta-pixel": { pixelId: "1234567890" },
});
```

Key behaviours:

- **Idempotent per plugin.** A plugin that has already been initialized is skipped on
  subsequent calls. This makes repeated calls safe during hot-module-reload / dev reloads.
- **Order of effects after init.** Any consent stored via [`setConsent`](#setconsentstate) is
  applied first, then any stored user identity via [`setUser`](#setuserproperties), then the
  pre-init event queue is replayed (see [`track`](#trackeventname-params)).

## `track(eventName, params)`

```ts
track<E extends EventName>(eventName: E, params: EventMap[E]): void
```

Sends one event to every registered plugin. `eventName` must be a key of
[`EventMap`](/reference/event-map/) and `params` is checked against that event's parameter type.

A fresh [`EventContext`](/reference/event-context/) (carrying a unique `eventId`) is generated
for each call and passed to every plugin, so all platforms see the same event identity.

```ts
funnel.track("page_view", { page_title: "Home" });

funnel.track("purchase", {
  transaction_id: "T-1",
  currency: "KRW",
  value: 29000,
});
```

### Queuing before `initialize`

You can call `track()` before `initialize()`. Such events are **queued and replayed** in order
once initialization completes:

- The queue holds up to **100** events. Beyond that, new events are dropped with a console
  warning.
- The `eventId` is generated at **call time**, so a queued event keeps its original identity
  when it is later replayed.

## `setUser(properties)`

```ts
setUser(properties: UserProperties): void
```

Sets user identity and properties across all plugins that implement `setUser`. Uses the GA4
user-properties model as the canonical format. If called before `initialize()`, the properties
are stored and applied to each plugin during initialization (before the queued events replay).

`UserProperties` fields:

| Field | Type | Description |
| --- | --- | --- |
| `user_id` | `string` (optional) | Stable, cross-device user identifier (GA4 `user_id`). |
| `email` | `string` (optional) | Email address. Used for advanced matching on Meta, TikTok, X, Google Ads. |
| `phone_number` | `string` (optional) | Phone number in E.164 format. Used for advanced matching. |
| `first_name` | `string` (optional) | First name. Used for Meta Advanced Matching and Google Enhanced Conversions. |
| `last_name` | `string` (optional) | Last name. Used for Meta Advanced Matching and Google Enhanced Conversions. |
| `[key: string]` | `unknown` | Arbitrary custom user properties. |

```ts
funnel.setUser({ user_id: "u-123", email: "user@example.com" });
```

## `resetUser()`

```ts
resetUser(): void
```

Clears user identity across all plugins (logout scenario). Clears the stored user properties and
calls `resetUser()` on each plugin that implements it.

```ts
funnel.resetUser();
```

## `setConsent(state)`

```ts
setConsent(state: ConsentState): void
```

Updates the user's consent state across all plugins that implement `setConsent`. Accepts
**partial** updates: the given signals are merged into the last known state, and the full
accumulated `ConsentState` is forwarded to each plugin. If called before `initialize()`, the
state is stored and applied during initialization, before user identity and queued events.

`ConsentState` follows the Google Consent Mode v2 signal model. Each field is a `ConsentStatus`
(`"granted" | "denied"`), and all fields are optional.

| Field | Type | Description |
| --- | --- | --- |
| `ad_storage` | `ConsentStatus` (optional) | Cookies/identifiers for advertising purposes. |
| `analytics_storage` | `ConsentStatus` (optional) | Cookies/identifiers for analytics purposes. |
| `ad_user_data` | `ConsentStatus` (optional) | Sending user data to Google for advertising (Consent Mode v2). |
| `ad_personalization` | `ConsentStatus` (optional) | Personalized advertising (Consent Mode v2). |

```ts
funnel.setConsent({ analytics_storage: "granted" });
// later, merged into the previous state
funnel.setConsent({ ad_storage: "granted", ad_user_data: "granted" });
```

## See also

- [`EventMap`](/reference/event-map/): the event names and parameters `track()` accepts.
- [`FunnelPlugin`](/reference/funnel-plugin/): the interface each registered plugin implements.
- [`EventContext`](/reference/event-context/): the per-event context generated on each
  `track()`.
