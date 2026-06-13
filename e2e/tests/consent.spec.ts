/**
 * Consent e2e spec — AC-6
 *
 * 플러그인별 consent 동작을 검증한다.
 *
 * CAPI (consentRequired:true):
 *   - setConsent({ ad_storage:"denied" }) 상태에서 track → POST 0건
 *   - setConsent({ ad_storage:"granted" }) 후 track → POST 발생
 *   출처: meta-conversion-api/index.ts + internal/consent.ts:33-37
 *
 * Meta Pixel:
 *   - setConsent({ ad_storage:"denied" }) → fbq("consent","revoke") 호출
 *   - setConsent({ ad_storage:"granted" }) → fbq("consent","grant") 호출
 *   출처: meta-pixel/index.ts:177-182
 *
 * consent.html 픽스처 페이지는 GA4 + Pixel + CAPI (consentRequired:true)를
 * 동시에 로드한다.
 */

import { expect, test } from "@playwright/test";
import { interceptCapi } from "./_helpers/intercept.js";

test.describe("Consent — CAPI consentRequired gate", () => {
  test("blocks CAPI POST when ad_storage is denied", async ({ page }) => {
    const capturedCapi = await interceptCapi(page);

    await page.goto("/pages/consent.html");

    // CAPI 게이트 검증이 주목적이므로 Pixel SDK 로드 게이트는 불필요.
    // fbq 스텁이 호출을 큐잉하므로 클릭 직후 CAPI 요청 차단 여부를 확인할 수 있다.

    // consent denied 상태 설정
    await page.click("#consent-deny");

    // denied 상태에서 이벤트 발행
    await page.click("#track-purchase");

    // 짧은 고정 대기: sendBeacon은 동기이므로 클릭 직후 요청이 없으면 차단된 것
    await page.waitForTimeout(2_000);

    expect(capturedCapi).toHaveLength(0);
  });

  test("allows CAPI POST after ad_storage is granted", async ({ page }) => {
    const capturedCapi = await interceptCapi(page);

    await page.goto("/pages/consent.html");

    // denied로 시작 후 granted로 변경
    await page.click("#consent-deny");
    await page.click("#consent-grant");

    await page.click("#track-purchase");

    await expect.poll(() => capturedCapi.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    const payload = capturedCapi.find((p) => p.event_name === "Purchase");
    expect(payload, "Purchase CAPI payload not found after consent granted").toBeDefined();
    expect(payload?.action_source).toBe("website");
  });
});

test.describe("Consent — Meta Pixel fbq consent calls", () => {
  test("calls fbq('consent','revoke') when ad_storage is denied", async ({ page }) => {
    // fbq 호출 기록을 window에 수집하는 spy를 fbevents.js 로드 전에 설치
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__fbqConsentCalls = [];
      const origFbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      Object.defineProperty(window, "fbq", {
        get() {
          return origFbq;
        },
        set(fn: (...args: unknown[]) => void) {
          const wrapped = (...args: unknown[]) => {
            if (args[0] === "consent") {
              (window as unknown as { __fbqConsentCalls: unknown[][] }).__fbqConsentCalls.push([
                ...args,
              ]);
            }
            return fn(...args);
          };
          Object.defineProperty(window, "fbq", { value: wrapped, writable: true });
        },
        configurable: true,
      });
    });

    await page.goto("/pages/consent.html");

    // spy의 setter가 fbevents.js 로드 시점에 실행되므로 SDK 로드 후 클릭해야 함.
    // wrapped fbq는 typeof === "function"이면 준비 완료.
    await page.waitForFunction(
      () => typeof (window as unknown as { fbq?: unknown }).fbq === "function",
      { timeout: 15_000 },
    );

    await page.click("#consent-deny");

    // fbq("consent","revoke") 호출이 기록될 때까지 대기
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as { __fbqConsentCalls?: unknown[][] }).__fbqConsentCalls ?? [],
          ),
        { timeout: 5_000 },
      )
      .toEqual(expect.arrayContaining([expect.arrayContaining(["consent", "revoke"])]));
  });

  test("calls fbq('consent','grant') when ad_storage is granted", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__fbqConsentCalls = [];
      const origFbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      Object.defineProperty(window, "fbq", {
        get() {
          return origFbq;
        },
        set(fn: (...args: unknown[]) => void) {
          const wrapped = (...args: unknown[]) => {
            if (args[0] === "consent") {
              (window as unknown as { __fbqConsentCalls: unknown[][] }).__fbqConsentCalls.push([
                ...args,
              ]);
            }
            return fn(...args);
          };
          Object.defineProperty(window, "fbq", { value: wrapped, writable: true });
        },
        configurable: true,
      });
    });

    await page.goto("/pages/consent.html");

    await page.waitForFunction(
      () => typeof (window as unknown as { fbq?: unknown }).fbq === "function",
      { timeout: 15_000 },
    );

    await page.click("#consent-grant");

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as { __fbqConsentCalls?: unknown[][] }).__fbqConsentCalls ?? [],
          ),
        { timeout: 5_000 },
      )
      .toEqual(expect.arrayContaining([expect.arrayContaining(["consent", "grant"])]));
  });
});

test.describe("Consent — setUser reflected in CAPI user_data", () => {
  test("includes hashed PII in user_data after setUser then track", async ({ page }) => {
    const capturedCapi = await interceptCapi(page);

    await page.goto("/pages/consent.html");

    // granted 후 setUser
    await page.click("#consent-grant");
    await page.click("#set-user");

    await page.click("#track-purchase");

    // 해시 Promise 완료 대기 — waitForRequest는 요청이 먼저 오면 놓치므로
    // expect.poll만 사용한다 (통과한 디스패치 테스트와 동일 패턴).
    await expect.poll(() => capturedCapi.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    const payload = capturedCapi.find((p) => p.event_name === "Purchase");
    expect(payload, "Purchase CAPI payload not found").toBeDefined();

    const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
    const ud = payload?.user_data;

    for (const field of ["em", "ph", "fn", "ln", "external_id"] as const) {
      const val = ud?.[field];
      expect(val, `user_data.${field} missing`).toBeTruthy();
      expect(
        typeof val === "string" && SHA256_HEX_RE.test(val),
        `user_data.${field} must be SHA-256 hex (got: ${val})`,
      ).toBe(true);
    }
  });
});
