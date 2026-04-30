/**
 * Helpers shared by product-analytics plugins (Mixpanel, Amplitude) that
 * convert GA4 snake_case event names to Title Case and flatten item arrays
 * to top-level summary properties.
 *
 * Internal — not part of the public client API.
 *
 * @internal
 */

import type { Item } from "@sunwjy/funnel-core";

export function toTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function flattenItems(items?: Item[]): Record<string, unknown> {
  if (!items || items.length === 0) return {};
  return {
    item_ids: items.map((item) => item.item_id),
    item_names: items.map((item) => item.item_name),
    num_items: items.length,
  };
}
