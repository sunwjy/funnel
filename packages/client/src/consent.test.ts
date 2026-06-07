import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAmplitudePlugin } from "./plugins/amplitude/index";
import { createDaangnAdsPlugin } from "./plugins/daangn-ads/index";
import { createGA4Plugin } from "./plugins/ga4/index";
import { createGoogleAdsPlugin } from "./plugins/google-ads/index";
import { createGTMPlugin } from "./plugins/gtm/index";
import { createKakaoPixelPlugin } from "./plugins/kakao-pixel/index";
import { createLinkedInInsightPlugin } from "./plugins/linkedin-insight/index";
import { createMetaConversionApiPlugin } from "./plugins/meta-conversion-api/index";
import { createMetaPixelPlugin } from "./plugins/meta-pixel/index";
import { createMixpanelPlugin } from "./plugins/mixpanel/index";
import { createNaverAdPlugin } from "./plugins/naver-ad/index";
import { createPinterestTagPlugin } from "./plugins/pinterest-tag/index";
import { createRedditPixelPlugin } from "./plugins/reddit-pixel/index";
import { createSGTMPlugin } from "./plugins/sgtm/index";
import { createTikTokPixelPlugin } from "./plugins/tiktok-pixel/index";
import { createTossAdsPlugin } from "./plugins/toss-ads/index";
import { createXPixelPlugin } from "./plugins/x-pixel/index";

/**
 * Cross-cutting consent contract (Google Consent Mode v2 signal model):
 *
 * - gtag-family plugins (ga4, google-ads, gtm) forward the full state via
 *   `gtag("consent", "update", state)`.
 * - meta-pixel down-maps `ad_storage` to `fbq("consent", "grant" | "revoke")`.
 * - Platforms without a consent API gate event dispatch ONLY when the
 *   plugin is configured with `consentRequired: true` (opt-in): ad
 *   platforms key off `ad_storage`, analytics platforms off
 *   `analytics_storage`. Default behavior (no `consentRequired`) is
 *   unchanged — platform delegation, no gating.
 */
describe("consent mode", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key of [
      "gtag",
      "dataLayer",
      "fbq",
      "ttq",
      "kakaoPixel",
      "wcs",
      "wcs_do",
      "wcs_add",
      "twq",
      "lintrk",
      "_linkedin_data_partner_ids",
      "mixpanel",
      "amplitude",
      "TossPixel",
      "rdt",
      "karrotPixel",
      "pintrk",
    ]) {
      // @ts-expect-error — reset globals between cases
      delete window[key];
    }
    navigator.sendBeacon = vi.fn().mockReturnValue(true);
  });

  describe("gtag family — consent update passthrough", () => {
    it("ga4 should forward the full state to gtag consent update", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.setConsent?.({ ad_storage: "denied", analytics_storage: "granted" });

      expect(window.gtag).toHaveBeenCalledWith("consent", "update", {
        ad_storage: "denied",
        analytics_storage: "granted",
      });
    });

    it("google-ads should forward the full state to gtag consent update", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.setConsent?.({ ad_user_data: "denied", ad_personalization: "denied" });

      expect(window.gtag).toHaveBeenCalledWith("consent", "update", {
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    });

    it("gtm should forward to gtag consent update when the gtag stub exists", () => {
      window.gtag = vi.fn();
      const plugin = createGTMPlugin();

      plugin.setConsent?.({ analytics_storage: "denied" });

      expect(window.gtag).toHaveBeenCalledWith("consent", "update", {
        analytics_storage: "denied",
      });
    });

    it("gtm should not throw when no gtag stub exists", () => {
      const plugin = createGTMPlugin();

      expect(() => plugin.setConsent?.({ analytics_storage: "denied" })).not.toThrow();
    });
  });

  describe("meta-pixel — grant/revoke down-mapping", () => {
    it("should revoke when ad_storage is denied", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.setConsent?.({ ad_storage: "denied" });

      expect(window.fbq).toHaveBeenCalledWith("consent", "revoke");
    });

    it("should grant when ad_storage is granted", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.setConsent?.({ ad_storage: "granted" });

      expect(window.fbq).toHaveBeenCalledWith("consent", "grant");
    });

    it("should not call fbq when ad_storage is not in the state", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.setConsent?.({ analytics_storage: "denied" });

      expect(window.fbq).not.toHaveBeenCalled();
    });
  });

  describe("opt-in gating — ad platforms (ad_storage)", () => {
    it("meta-conversion-api should gate until ad_storage is granted", () => {
      const plugin = createMetaConversionApiPlugin({
        endpoint: "https://example.com/api",
        consentRequired: true,
      });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(navigator.sendBeacon).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    });

    it("tiktok-pixel should gate until ad_storage is granted", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin({ pixelId: "TT-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);
      expect(window.ttq.track).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);
      expect(window.ttq.track).toHaveBeenCalledTimes(1);
    });

    it("kakao-pixel should gate until ad_storage is granted", () => {
      const instance = {
        pageView: vi.fn(),
        search: vi.fn(),
        viewContent: vi.fn(),
        viewCart: vi.fn(),
        addToCart: vi.fn(),
        purchase: vi.fn(),
        completeRegistration: vi.fn(),
        participation: vi.fn(),
      };
      window.kakaoPixel = vi.fn(() => instance);
      const plugin = createKakaoPixelPlugin({ trackId: "KK-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(instance.pageView).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(instance.pageView).toHaveBeenCalledTimes(1);
    });

    it("naver-ad should gate until ad_storage is granted", () => {
      window.wcs = { inflow: vi.fn(), trans: vi.fn() };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin({ accountId: "NV-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);
      expect(window.wcs.trans).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);
      expect(window.wcs.trans).toHaveBeenCalledTimes(1);
    });

    it("x-pixel should gate until ad_storage is granted", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin({ pixelId: "X-1", consentRequired: true });
      plugin.initialize({});
      (window.twq as ReturnType<typeof vi.fn>).mockClear();

      plugin.track("page_view", {}, mockContext);
      expect(window.twq).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.twq).toHaveBeenCalledTimes(1);
    });

    it("linkedin-insight should gate until ad_storage is granted", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin({
        partnerId: "LI-1",
        conversionIds: { sign_up: 123 },
        consentRequired: true,
      });
      plugin.initialize({});

      plugin.track("sign_up", {}, mockContext);
      expect(window.lintrk).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("sign_up", {}, mockContext);
      expect(window.lintrk).toHaveBeenCalledTimes(1);
    });

    it("toss-ads should gate until ad_storage is granted", () => {
      const instance = {
        pageView: vi.fn(),
        viewHome: vi.fn(),
        productView: vi.fn(),
        addToCart: vi.fn(),
        addToWishlist: vi.fn(),
        initiateCheckout: vi.fn(),
        purchase: vi.fn(),
        search: vi.fn(),
        signUp: vi.fn(),
        signIn: vi.fn(),
        lead: vi.fn(),
      };
      window.TossPixel = vi.fn(() => instance);
      const plugin = createTossAdsPlugin({ conversionCode: "TS-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(instance.pageView).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(instance.pageView).toHaveBeenCalledTimes(1);
    });

    it("reddit-pixel should gate until ad_storage is granted", () => {
      window.rdt = vi.fn();
      const plugin = createRedditPixelPlugin({ pixelId: "RD-1", consentRequired: true });
      plugin.initialize({});
      (window.rdt as ReturnType<typeof vi.fn>).mockClear(); // drop the init call

      plugin.track("page_view", {}, mockContext);
      expect(window.rdt).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.rdt).toHaveBeenCalledTimes(1);
    });

    it("daangn-ads should gate until ad_storage is granted", () => {
      window.karrotPixel = { init: vi.fn(), track: vi.fn() };
      const plugin = createDaangnAdsPlugin({ trackId: "DG-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(window.karrotPixel.track).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.karrotPixel.track).toHaveBeenCalledTimes(1);
    });

    it("pinterest-tag should gate until ad_storage is granted", () => {
      window.pintrk = vi.fn();
      const plugin = createPinterestTagPlugin({ tagId: "PT-1", consentRequired: true });
      plugin.initialize({});
      (window.pintrk as ReturnType<typeof vi.fn>).mockClear(); // drop load/page calls

      plugin.track("page_view", {}, mockContext);
      expect(window.pintrk).not.toHaveBeenCalled();

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.pintrk).toHaveBeenCalledTimes(1);
    });
  });

  describe("opt-in gating — analytics platforms (analytics_storage)", () => {
    it("sgtm should gate until analytics_storage is granted", () => {
      const plugin = createSGTMPlugin({
        endpoint: "https://sgtm.example.com",
        measurementId: "G-1",
        consentRequired: true,
      });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(navigator.sendBeacon).not.toHaveBeenCalled();

      plugin.setConsent?.({ analytics_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    });

    it("mixpanel should gate until analytics_storage is granted", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin({ token: "MP-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(window.mixpanel.track).not.toHaveBeenCalled();

      plugin.setConsent?.({ analytics_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.mixpanel.track).toHaveBeenCalledTimes(1);
    });

    it("amplitude should gate until analytics_storage is granted", () => {
      window.amplitude = {
        init: vi.fn(),
        track: vi.fn(),
        setUserId: vi.fn(),
        identify: vi.fn(),
        Identify: class {
          set = vi.fn().mockReturnThis();
        },
      };
      const plugin = createAmplitudePlugin({ apiKey: "AMP-1", consentRequired: true });
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);
      expect(window.amplitude.track).not.toHaveBeenCalled();

      plugin.setConsent?.({ analytics_storage: "granted" });
      plugin.track("page_view", {}, mockContext);
      expect(window.amplitude.track).toHaveBeenCalledTimes(1);
    });
  });

  describe("default behavior — no consentRequired", () => {
    it("should not gate events when consentRequired is not set (platform delegation)", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin({ token: "MP-1" });
      plugin.initialize({});

      // No consent signal at all — dispatch proceeds (delegation model).
      plugin.track("page_view", {}, mockContext);
      expect(window.mixpanel.track).toHaveBeenCalledTimes(1);
    });

    it("should keep dispatching on denied when consentRequired is not set", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin({ pixelId: "TT-1" });
      plugin.initialize({});

      plugin.setConsent?.({ ad_storage: "denied" });
      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledTimes(1);
    });

    it("re-denying after grant should gate again when consentRequired is true", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin({ pixelId: "TT-1", consentRequired: true });
      plugin.initialize({});

      plugin.setConsent?.({ ad_storage: "granted" });
      plugin.setConsent?.({ ad_storage: "denied" });
      plugin.track("purchase", { transaction_id: "T-1", value: 10 }, mockContext);

      expect(window.ttq.track).not.toHaveBeenCalled();
    });
  });
});
