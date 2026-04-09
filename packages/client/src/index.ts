// Re-export core for convenience

export type {
  EventContext,
  EventMap,
  EventName,
  FunnelConfig,
  FunnelPlugin,
  Item,
} from "@funnel/core";
export { Funnel } from "@funnel/core";
export { createAmplitudePlugin } from "./plugins/amplitude/index.js";
// Client-side plugins
export { createGA4Plugin } from "./plugins/ga4/index.js";
export { createGoogleAdsPlugin } from "./plugins/google-ads/index.js";
export { createGTMPlugin } from "./plugins/gtm/index.js";
export { createKakaoPixelPlugin } from "./plugins/kakao-pixel/index.js";
export { createLinkedInInsightPlugin } from "./plugins/linkedin-insight/index.js";
export { createMetaConversionApiPlugin } from "./plugins/meta-conversion-api/index.js";
export { createMetaPixelPlugin } from "./plugins/meta-pixel/index.js";
export { createMixpanelPlugin } from "./plugins/mixpanel/index.js";
export { createNaverAdPlugin } from "./plugins/naver-ad/index.js";
export { createTikTokPixelPlugin } from "./plugins/tiktok-pixel/index.js";
export { createXPixelPlugin } from "./plugins/x-pixel/index.js";
