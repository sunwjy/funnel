---
"@sunwjy/funnel-client": minor
---

Re-export the entire `@sunwjy/funnel-core` public API from `@sunwjy/funnel-client`. The `Funnel` class, every event parameter type, and helpers like `hashPii`/`normalizePii` are now all available directly from `@sunwjy/funnel-client`.

As a result, installing `@sunwjy/funnel-client` alone is enough — `@sunwjy/funnel-core` is pulled in automatically as a dependency and never has to be installed or imported separately.
