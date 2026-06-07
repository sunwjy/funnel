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
 * Cross-cutting contract: every plugin factory accepts a typed config object,
 * and runtime config passed to `initialize()` overrides the factory config
 * key-by-key (shallow merge, runtime wins).
 */
describe("factory-level plugin config", () => {
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

  describe("ga4", () => {
    it("should initialize from factory config", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin({ measurementId: "G-FACTORY" });

      plugin.initialize({});

      expect(window.gtag).toHaveBeenCalledWith("config", "G-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin({ measurementId: "G-FACTORY" });

      plugin.initialize({ measurementId: "G-RUNTIME" });

      expect(window.gtag).toHaveBeenCalledWith("config", "G-RUNTIME");
      expect(window.gtag).not.toHaveBeenCalledWith("config", "G-FACTORY");
    });
  });

  describe("gtm", () => {
    it("should initialize from factory config", () => {
      const plugin = createGTMPlugin({ containerId: "GTM-FACTORY" });

      plugin.initialize({});

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([expect.objectContaining({ event: "gtm.js" })]),
      );
    });
  });

  describe("sgtm", () => {
    it("should initialize from factory config", () => {
      const plugin = createSGTMPlugin({
        endpoint: "https://sgtm.example.com",
        measurementId: "G-FACTORY",
      });

      plugin.initialize({});
      plugin.track("page_view", {}, mockContext);

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("measurement_id=G-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      const plugin = createSGTMPlugin({
        endpoint: "https://sgtm.example.com",
        measurementId: "G-FACTORY",
      });

      plugin.initialize({ measurementId: "G-RUNTIME" });
      plugin.track("page_view", {}, mockContext);

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("measurement_id=G-RUNTIME");
    });
  });

  describe("meta-pixel", () => {
    it("should initialize from factory config", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin({ pixelId: "PX-FACTORY" });

      plugin.initialize({});

      expect(window.fbq).toHaveBeenCalledWith("init", "PX-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin({ pixelId: "PX-FACTORY" });

      plugin.initialize({ pixelId: "PX-RUNTIME" });

      expect(window.fbq).toHaveBeenCalledWith("init", "PX-RUNTIME");
    });
  });

  describe("meta-conversion-api", () => {
    it("should initialize from factory config", () => {
      const plugin = createMetaConversionApiPlugin({
        endpoint: "https://example.com/api/factory",
      });

      plugin.initialize({});
      plugin.track("page_view", {}, mockContext);

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toBe("https://example.com/api/factory");
    });

    it("should let initialize-time config override factory config", () => {
      const plugin = createMetaConversionApiPlugin({
        endpoint: "https://example.com/api/factory",
      });

      plugin.initialize({ endpoint: "https://example.com/api/runtime" });
      plugin.track("page_view", {}, mockContext);

      const url = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toBe("https://example.com/api/runtime");
    });
  });

  describe("google-ads", () => {
    it("should initialize from factory config", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin({ conversionId: "AW-FACTORY" });

      plugin.initialize({});

      expect(window.gtag).toHaveBeenCalledWith("config", "AW-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin({ conversionId: "AW-FACTORY" });

      plugin.initialize({ conversionId: "AW-RUNTIME" });

      expect(window.gtag).toHaveBeenCalledWith("config", "AW-RUNTIME");
    });
  });

  describe("tiktok-pixel", () => {
    it("should initialize from factory config", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin({ pixelId: "TT-FACTORY" });

      plugin.initialize({});

      expect(window.ttq.load).toHaveBeenCalledWith("TT-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin({ pixelId: "TT-FACTORY" });

      plugin.initialize({ pixelId: "TT-RUNTIME" });

      expect(window.ttq.load).toHaveBeenCalledWith("TT-RUNTIME");
    });
  });

  describe("kakao-pixel", () => {
    it("should initialize from factory config", () => {
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
      const plugin = createKakaoPixelPlugin({ trackId: "KK-FACTORY" });

      plugin.initialize({});
      plugin.track("page_view", {}, mockContext);

      expect(window.kakaoPixel).toHaveBeenCalledWith("KK-FACTORY");
    });
  });

  describe("naver-ad", () => {
    it("should initialize from factory config", () => {
      window.wcs = { inflow: vi.fn(), trans: vi.fn() };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin({ accountId: "NV-FACTORY" });

      plugin.initialize({});

      expect(window.wcs_add).toEqual({ wa: "NV-FACTORY" });
    });

    it("should let initialize-time config override factory config", () => {
      window.wcs = { inflow: vi.fn(), trans: vi.fn() };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin({ accountId: "NV-FACTORY" });

      plugin.initialize({ accountId: "NV-RUNTIME" });

      expect(window.wcs_add).toEqual({ wa: "NV-RUNTIME" });
    });
  });

  describe("x-pixel", () => {
    it("should initialize from factory config", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin({ pixelId: "X-FACTORY" });

      plugin.initialize({});

      expect(window.twq).toHaveBeenCalledWith("config", "X-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin({ pixelId: "X-FACTORY" });

      plugin.initialize({ pixelId: "X-RUNTIME" });

      expect(window.twq).toHaveBeenCalledWith("config", "X-RUNTIME");
    });
  });

  describe("linkedin-insight", () => {
    it("should initialize from factory config", () => {
      const plugin = createLinkedInInsightPlugin({ partnerId: "LI-FACTORY" });

      plugin.initialize({});

      expect(window._linkedin_data_partner_ids).toContain("LI-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      const plugin = createLinkedInInsightPlugin({ partnerId: "LI-FACTORY" });

      plugin.initialize({ partnerId: "LI-RUNTIME" });

      expect(window._linkedin_data_partner_ids).toContain("LI-RUNTIME");
      expect(window._linkedin_data_partner_ids).not.toContain("LI-FACTORY");
    });
  });

  describe("mixpanel", () => {
    it("should initialize from factory config", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin({ token: "MP-FACTORY" });

      plugin.initialize({});

      expect(window.mixpanel.init).toHaveBeenCalledWith("MP-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin({ token: "MP-FACTORY" });

      plugin.initialize({ token: "MP-RUNTIME" });

      expect(window.mixpanel.init).toHaveBeenCalledWith("MP-RUNTIME");
    });
  });

  describe("amplitude", () => {
    class MockIdentify {
      set = vi.fn().mockReturnThis();
    }

    it("should initialize from factory config", () => {
      window.amplitude = {
        init: vi.fn(),
        track: vi.fn(),
        setUserId: vi.fn(),
        identify: vi.fn(),
        Identify: MockIdentify,
      };
      const plugin = createAmplitudePlugin({ apiKey: "AMP-FACTORY" });

      plugin.initialize({});

      expect(window.amplitude.init).toHaveBeenCalledWith("AMP-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.amplitude = {
        init: vi.fn(),
        track: vi.fn(),
        setUserId: vi.fn(),
        identify: vi.fn(),
        Identify: MockIdentify,
      };
      const plugin = createAmplitudePlugin({ apiKey: "AMP-FACTORY" });

      plugin.initialize({ apiKey: "AMP-RUNTIME" });

      expect(window.amplitude.init).toHaveBeenCalledWith("AMP-RUNTIME");
    });
  });

  describe("toss-ads", () => {
    it("should initialize from factory config", () => {
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
      const plugin = createTossAdsPlugin({ conversionCode: "TS-FACTORY" });

      plugin.initialize({});
      plugin.track("page_view", {}, mockContext);

      expect(window.TossPixel).toHaveBeenCalledWith("TS-FACTORY");
    });
  });

  describe("reddit-pixel", () => {
    it("should initialize from factory config", () => {
      window.rdt = vi.fn();
      const plugin = createRedditPixelPlugin({ pixelId: "RD-FACTORY" });

      plugin.initialize({});

      expect(window.rdt).toHaveBeenCalledWith("init", "RD-FACTORY");
    });

    it("should let initialize-time config override factory config", () => {
      window.rdt = vi.fn();
      const plugin = createRedditPixelPlugin({ pixelId: "RD-FACTORY" });

      plugin.initialize({ pixelId: "RD-RUNTIME" });

      expect(window.rdt).toHaveBeenCalledWith("init", "RD-RUNTIME");
    });
  });

  describe("daangn-ads", () => {
    it("should initialize from factory config", () => {
      window.karrotPixel = { init: vi.fn(), track: vi.fn() };
      const plugin = createDaangnAdsPlugin({ trackId: "DG-FACTORY" });

      plugin.initialize({});
      plugin.track("page_view", {}, mockContext);

      expect(window.karrotPixel.init).toHaveBeenCalledWith("DG-FACTORY");
    });
  });

  describe("pinterest-tag", () => {
    it("should initialize from factory config", () => {
      window.pintrk = vi.fn();
      const plugin = createPinterestTagPlugin({ tagId: "PT-FACTORY" });

      plugin.initialize({});

      expect(window.pintrk).toHaveBeenCalledWith("load", "PT-FACTORY");
    });
  });
});
