---
title: FunnelPlugin
description: "The interface every plugin implements: name, initialize, track, and optional hooks."
sidebar:
  order: 3
---

`FunnelPlugin` is the contract every plugin implements. Each analytics platform (GA4, Meta
Pixel, etc.) provides an object that satisfies this interface and is registered with a
[`Funnel`](/reference/funnel/) instance. You only need to implement this interface yourself when
writing a **custom** plugin. The built-in `createXxxPlugin()` factories already return objects
that satisfy it.

```ts
import type { FunnelPlugin } from "@sunwjy/funnel-core";
// also re-exported from "@sunwjy/funnel-client"
```

## Interface

| Member | Signature | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Unique plugin name. Also used as the key for plugin-specific configuration in `initialize`. |
| `initialize` | `(config: Record<string, unknown>) => void` | Yes | Initializes the plugin with its config object. |
| `track` | `<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) => void` | Yes | Tracks one event. |
| `setUser` | `(properties: UserProperties) => void` | Optional | Sets user identity for the plugin. |
| `resetUser` | `() => void` | Optional | Clears user identity (logout). |
| `setConsent` | `(state: ConsentState) => void` | Optional | Applies the accumulated consent state. |

### `name`

A unique string. The `Funnel` dispatcher uses it to look up this plugin's configuration in
[`initialize(pluginConfigs)`](/reference/funnel/#initializepluginconfigs): the value at
`pluginConfigs[name]` is what gets passed to your `initialize`.

### `initialize(config)`

```ts
initialize(config: Record<string, unknown>): void
```

Called once per plugin by `Funnel.initialize()`. `config` is the object keyed by your `name`
(or `{}` if none was provided). This is where you read IDs and set up platform globals.

### `track(eventName, params, context)`

```ts
track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void
```

Called for every event. `eventName` is a key of [`EventMap`](/reference/event-map/), `params`
matches that event's parameter type, and `context` is the
[`EventContext`](/reference/event-context/) carrying the shared `eventId`. Map the GA4-shaped
input into your platform's native call here.

### `setUser(properties)` (optional)

```ts
setUser?(properties: UserProperties): void
```

Optional. Receives [`UserProperties`](/reference/funnel/#setuserproperties) (the GA4 user model).
Plugins for platforms with no user identification (e.g., Kakao Pixel, Naver Ad) should omit it.

### `resetUser()` (optional)

```ts
resetUser?(): void
```

Optional. Reset any stored user state on logout.

### `setConsent(state)` (optional)

```ts
setConsent?(state: ConsentState): void
```

Optional. Receives the full accumulated [`ConsentState`](/reference/funnel/#setconsentstate)
(Google Consent Mode v2 signals). Map the signals to your platform's native consent API, or gate
event dispatch when the platform has none.

## Write your own plugin

A minimal plugin only needs `name`, `initialize`, and `track`. The optional hooks can be added
when your platform supports them.

```ts
import type { FunnelPlugin } from "@sunwjy/funnel-core";

export function createConsolePlugin(): FunnelPlugin {
  return {
    name: "console",

    initialize(config) {
      // Read your IDs / set up platform globals here.
      console.log("[console-plugin] initialized with", config);
    },

    track(eventName, params, context) {
      // Map the GA4 event into your platform's native call.
      // The shared eventId enables server-side deduplication.
      console.log("[console-plugin]", eventName, params, context.eventId);
    },

    // Optional hooks: include only what your platform supports.
    setUser(properties) {
      console.log("[console-plugin] setUser", properties);
    },
    resetUser() {
      console.log("[console-plugin] resetUser");
    },
    setConsent(state) {
      console.log("[console-plugin] setConsent", state);
    },
  };
}
```

Register it like any built-in plugin:

```ts
import { Funnel } from "@sunwjy/funnel-client";

const funnel = new Funnel({ plugins: [createConsolePlugin()] });
funnel.initialize({ console: { label: "demo" } });
funnel.track("page_view", { page_title: "Home" });
```

## See also

- [`Funnel`](/reference/funnel/): the dispatcher that drives these methods.
- [`EventMap`](/reference/event-map/): the events your `track` receives.
- [`EventContext`](/reference/event-context/): the `eventId` passed to `track`.
