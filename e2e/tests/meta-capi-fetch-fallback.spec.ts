/**
 * Meta CAPI e2e spec — AC-4 폴백 케이스 (fetch keepalive 경로)
 *
 * navigator.sendBeacon을 undefined로 강제 처리하여
 * transport.ts:18-27의 fetch keepalive 폴백 경로를 검증한다.
 *
 * 이 케이스는 주 검증(sendBeacon)을 대체하지 않으며
 * 독립된 테스트로 폴백 경로의 정상 동작을 보장한다.
 *
 * fetch keepalive 경로는 Playwright route.request().postDataBuffer()로
 * 바디를 정상 캡처할 수 있다 (sendBeacon Blob 버그 없음).
 */

import { expect, test } from "@playwright/test";
import { type CapturedCapiPayload, interceptCapi } from "./_helpers/intercept.js";

test.describe("Meta CAPI plugin (fetch keepalive fallback path)", () => {
  test("sends correct payload via fetch keepalive when sendBeacon is unavailable", async ({
    page,
  }) => {
    const captured: CapturedCapiPayload[] = await interceptCapi(page);

    await page.goto("/pages/meta-capi.html");

    // sendBeacon을 undefined로 교체 → transport.ts가 fetch keepalive로 폴백
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: navigator.sendBeacon must be overridden to force fetch keepalive fallback path
      (navigator as any).sendBeacon = undefined;
    });

    await page.click("#track-purchase");

    // waitForRequest는 요청이 등록 전에 도착하면 놓치므로 expect.poll만 사용.
    await expect.poll(() => captured.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

    const payload = captured.find((p) => p.event_name === "Purchase");
    expect(payload, "Purchase CAPI payload not found via fetch fallback").toBeDefined();

    // 주 경로와 동일한 페이로드 구조 검증
    expect(payload?.action_source).toBe("website");
    expect(payload?.event_id).toBeTruthy();
    expect(payload?.custom_data.currency).toBe("KRW");
    expect(payload?.custom_data.value).toBe(89000);
    expect(payload?.custom_data.content_ids as string[]).toContain("SHOE-001");
    expect(payload?.custom_data.order_id).toBe("TXN-E2E-001");
  });
});
