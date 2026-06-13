/**
 * Meta CAPI e2e spec — AC-4 (주 경로: sendBeacon)
 *
 * 주 검증 경로: navigator.sendBeacon → Blob → Playwright route intercept.
 * postDataBuffer()로 바디를 디코딩해야 한다 — postData()는 sendBeacon Blob에서
 * null을 반환(Playwright #24077 / #6479).
 *
 * CAPI 엔드포인트는 same-origin /__capi (fixtures.ts 참조).
 * 외부 URL을 사용하면 DNS 미해소로 sendBeacon이 false를 반환하고
 * fetch keepalive 폴백으로 오분기되어 주 경로 검증이 불가능해진다.
 *
 * PII 해싱: track()은 동기지만 전송은 hashed.then() fire-and-forget
 * (meta-conversion-api/index.ts:296-305). setUser 후 track 시나리오에서는
 * waitForRequest/expect.poll로 해시 Promise 해소를 반드시 대기해야 한다.
 */

import { expect, test } from "@playwright/test";
import { type CapturedCapiPayload, interceptCapi } from "./_helpers/intercept.js";

const FUNNEL_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

/** CAPI 이벤트 이름 매핑 (meta-conversion-api/index.ts EVENT_MAP) */
const CAPI_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

/** SHA-256 hex digest 패턴: 64자의 소문자 16진수 */
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

test.describe("Meta CAPI plugin (sendBeacon primary path)", () => {
  test("dispatches all four events to /__capi with correct payload fields", async ({ page }) => {
    const captured: CapturedCapiPayload[] = await interceptCapi(page);

    await page.goto("/pages/meta-capi.html");

    // 4개 이벤트 버튼 클릭
    for (const eventName of FUNNEL_EVENTS) {
      await page.click(`#track-${eventName}`);
    }

    // PII 해싱 없는 경로(setUser 없음)이므로 단순 이벤트 수 대기
    await expect
      .poll(() => captured.length, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(FUNNEL_EVENTS.length);

    const byEventName = new Map<string, CapturedCapiPayload>();
    for (const payload of captured) {
      byEventName.set(payload.event_name, payload);
    }

    for (const ga4Name of FUNNEL_EVENTS) {
      const capiName = CAPI_EVENT_MAP[ga4Name];
      const payload = byEventName.get(capiName);

      expect(
        payload,
        `CAPI payload not found for ${ga4Name} (expected event_name=${capiName})`,
      ).toBeDefined();

      // action_source는 항상 "website"
      expect(payload?.action_source).toBe("website");

      // event_id 존재 (중복제거 키)
      expect(payload?.event_id, `event_id missing for ${capiName}`).toBeTruthy();

      // event_time은 Unix epoch (초)
      expect(typeof payload?.event_time).toBe("number");
      expect(payload?.event_time).toBeGreaterThan(0);

      // custom_data: currency, value
      const cd = payload?.custom_data;
      expect(cd?.currency).toBe("KRW");
      expect(cd?.value).toBe(89000);

      // custom_data: content_ids, contents, num_items (items를 포함하는 이벤트)
      expect(Array.isArray(cd?.content_ids)).toBe(true);
      expect(cd?.content_ids as string[]).toContain("SHOE-001");
      expect(Array.isArray(cd?.contents)).toBe(true);
      expect(typeof cd?.num_items).toBe("number");

      // purchase 이벤트에는 order_id 포함
      if (ga4Name === "purchase") {
        expect(cd?.order_id).toBe("TXN-E2E-001");
      }
    }
  });

  test("includes SHA-256 hashed PII in user_data after setUser", async ({ page }) => {
    const captured: CapturedCapiPayload[] = await interceptCapi(page);

    await page.goto("/pages/meta-capi.html");

    // setUser 버튼 클릭 → 내부적으로 computeHashedUserData Promise 시작
    await page.click("#set-user");

    // 이벤트 1개만 발행해 user_data 확인
    await page.click("#track-purchase");

    // fire-and-forget 해시 체이닝 완료까지 대기.
    // waitForRequest는 요청이 등록 전에 도착하면 놓치므로 expect.poll만 사용.
    await expect.poll(() => captured.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    const purchasePayload = captured.find((p) => p.event_name === "Purchase");
    expect(purchasePayload, "Purchase CAPI payload not found").toBeDefined();

    const ud = purchasePayload?.user_data;

    // 모든 PII 필드는 SHA-256 hex (64자) — 원문 절대 불가
    for (const field of ["em", "ph", "fn", "ln", "external_id"] as const) {
      const val = ud?.[field];
      expect(val, `user_data.${field} missing after setUser`).toBeTruthy();
      expect(
        typeof val === "string" && SHA256_HEX_RE.test(val),
        `user_data.${field} is not a SHA-256 hex digest (got: ${val})`,
      ).toBe(true);
    }
  });
});
