/**
 * eventId 중복제거 e2e spec — AC-5
 *
 * 동일한 funnel.track() 1회 호출에서 생성된 EventContext.eventId가
 * Meta Pixel 요청의 `eid` 쿼리 파라미터와 CAPI POST 바디의 `event_id` 필드에
 * 문자열로 동일하게 실리는지 검증한다 (이벤트별 4쌍).
 *
 * dedup.html 픽스처 페이지는 Pixel + CAPI 플러그인을 동시에 로드하며
 * 각 track() 호출에 하나의 EventContext가 생성되어 양 플러그인에 전달된다.
 *
 * Pixel eid 출처: meta-pixel/index.ts:193  { eventID: context.eventId }
 * CAPI event_id 출처: meta-conversion-api/index.ts:277  event_id: context.eventId
 * EventContext 생성: funnel.ts:177  { eventId: generateEventId() }
 */

import { expect, test } from "@playwright/test";
import { interceptCapi, interceptMetaPixel } from "./_helpers/intercept.js";
import { parsePixelRequest } from "./_helpers/parse.js";

const FUNNEL_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

const CAPI_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

const PIXEL_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

test.describe("eventId deduplication (Pixel eid === CAPI event_id)", () => {
  test("each track() call produces matching eid in Pixel and event_id in CAPI for all 4 events", async ({
    page,
  }) => {
    const capturedPixel = await interceptMetaPixel(page);
    const capturedCapi = await interceptCapi(page);

    await page.goto("/pages/dedup.html");

    // interceptMetaPixel이 실제 fbevents.js CDN 대신 mock을 주입하므로
    // SDK 로드 게이트가 불필요하다. mock은 페이지 이동 전에 등록되며
    // fbq.loaded는 인라인 스텁에서 이미 true로 설정된다.

    // 이벤트를 하나씩 클릭하면서 각 쌍(Pixel + CAPI)이 도착할 때까지 대기.
    // 한꺼번에 4개를 클릭하면 요청 순서와 이벤트 이름 매핑이 어긋날 수 있으므로
    // 이벤트마다 개별 대기하여 쌍을 확실히 맞춘다.
    for (const ga4Name of FUNNEL_EVENTS) {
      const capiName = CAPI_EVENT_MAP[ga4Name];
      const pixelName = PIXEL_EVENT_MAP[ga4Name];

      const prevPixelLen = capturedPixel.length;
      const prevCapiLen = capturedCapi.length;

      await page.click(`#track-${ga4Name}`);

      // Pixel 요청 도착 대기
      await expect
        .poll(() => capturedPixel.length, { timeout: 15_000 })
        .toBeGreaterThan(prevPixelLen);

      // CAPI 요청 도착 대기 (PII 해시 없으므로 빠르게 도착)
      await expect
        .poll(() => capturedCapi.length, { timeout: 15_000 })
        .toBeGreaterThan(prevCapiLen);

      // 이번 클릭으로 새로 도착한 Pixel / CAPI 페이로드 추출
      const newPixelReqs = capturedPixel.slice(prevPixelLen);
      const newCapiPayloads = capturedCapi.slice(prevCapiLen);

      const pixelForEvent = newPixelReqs
        .map((r) => parsePixelRequest(r.url))
        .find((p) => p.ev === pixelName);

      const capiForEvent = newCapiPayloads.find((p) => p.event_name === capiName);

      expect(
        pixelForEvent,
        `Pixel request not found for ${ga4Name} (expected ev=${pixelName})`,
      ).toBeDefined();
      expect(
        capiForEvent,
        `CAPI payload not found for ${ga4Name} (expected event_name=${capiName})`,
      ).toBeDefined();

      // 핵심 어설션: 동일한 track() 호출에서 eventId가 양쪽에 동일하게 실려야 한다
      expect(pixelForEvent?.eid, `Pixel eid missing for ${ga4Name}`).toBeTruthy();
      expect(capiForEvent?.event_id, `CAPI event_id missing for ${ga4Name}`).toBeTruthy();
      expect(pixelForEvent?.eid).toBe(capiForEvent?.event_id);
    }
  });
});
