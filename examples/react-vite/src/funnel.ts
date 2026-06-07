import { createGA4Plugin, createMetaPixelPlugin, Funnel } from "@sunwjy/funnel-client";
import { createDebugPlugin } from "./debug-plugin";
import { injectPlatformScripts } from "./platform-scripts";

/**
 * Module-scoped Funnel instance — created once, shared across all React components.
 * Placing this outside React prevents re-instantiation on re-renders.
 */

export const debugPlugin = createDebugPlugin();

const ga4MeasurementId =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) ?? "G-PLACEHOLDER";
const metaPixelId = (import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? "0000000000";

injectPlatformScripts();

export const funnel = new Funnel({
  plugins: [
    createGA4Plugin({ measurementId: ga4MeasurementId }),
    createMetaPixelPlugin({ pixelId: metaPixelId }),
    debugPlugin,
  ],
});

// Track initial page view
funnel.track("page_view", {
  page_title: document.title,
  page_location: window.location.href,
});
