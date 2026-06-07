import { createGA4Plugin, createMetaPixelPlugin, Funnel } from "@sunwjy/funnel-client";
import { createDebugPlugin } from "./debug-plugin";

/**
 * 모듈 스코프 Funnel 인스턴스.
 *
 * @remarks
 * - Next.js 서버 렌더링 중에는 이 모듈이 로드되지만, `initialize()`와 `track()`은
 *   항상 클라이언트 사이드(`FunnelProvider`)에서만 호출됩니다.
 * - 라이브러리 내부에서 `typeof window` 가드가 있어 SSR 중 플러그인이 no-op으로 동작합니다.
 * - `initialize()` 전에 호출된 `track()`은 최대 100개까지 큐에 쌓이며,
 *   `initialize()` 이후 순서대로 재생됩니다 (이벤트 유실 없음).
 */

const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export const debugPlugin = createDebugPlugin();

export const funnel = new Funnel({
  plugins: [createGA4Plugin(), createMetaPixelPlugin(), debugPlugin],
  debug: process.env.NODE_ENV === "development",
});

/**
 * 플러그인 설정 맵. `FunnelProvider`에서 `initialize()` 호출 시 전달됩니다.
 */
export const pluginConfigs: Record<string, Record<string, unknown>> = {
  ga4: { measurementId: ga4MeasurementId },
  "meta-pixel": { pixelId: metaPixelId },
};
