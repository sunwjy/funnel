---
title: Reference
description: The event schema and core APIs.
sidebar:
  order: 0
---

The reference describes Funnel's stable surface. If you're just getting started, the
[guides](/guides/) are a gentler path; come here when you need exact names and shapes.

- **`EventMap`**: the GA4-based catalog of event names and their parameters.
- **`Funnel`**: the dispatcher class: `new Funnel({ plugins })`, `initialize()`, `track()`.
- **`FunnelPlugin`**: the interface every plugin implements.
- **`EventContext`**: the per-event context (including the generated `eventId`) passed to
  every plugin.

Detailed pages are listed in the sidebar.
