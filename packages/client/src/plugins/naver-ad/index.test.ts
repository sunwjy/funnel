import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNaverAdPlugin } from "./index";

describe("createNaverAdPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset globals
    delete window.wcs;
    // @ts-expect-error — reset globals
    delete window.wcs_do;
  });

  it("should have name 'naver-ad'", () => {
    const plugin = createNaverAdPlugin();
    expect(plugin.name).toBe("naver-ad");
  });

  describe("initialize", () => {
    it("should call wcs.inflow with siteId when siteId is provided", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.initialize({ siteId: "abc123" });

      expect(window.wcs.inflow).toHaveBeenCalledWith("abc123");
    });

    it("should not call wcs.inflow when siteId is absent", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.initialize({});

      expect(window.wcs.inflow).not.toHaveBeenCalled();
    });

    it("should not throw when wcs is not defined (SSR)", () => {
      const plugin = createNaverAdPlugin();

      expect(() => plugin.initialize({ siteId: "abc123" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should set wcs.cnv to undefined and call wcs_do for page_view", () => {
      window.wcs = { inflow: vi.fn(), cnv: "previous" };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.wcs.cnv).toBeUndefined();
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '1,{value}' and call wcs_do for purchase", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("purchase", { currency: "KRW", value: 29000, items: [] }, mockContext);

      expect(window.wcs.cnv).toBe("1,29000");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '2,0' and call wcs_do for sign_up", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.wcs.cnv).toBe("2,0");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '3,{value}' and call wcs_do for add_to_cart", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("add_to_cart", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.wcs.cnv).toBe("3,5000");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '4,{value}' and call wcs_do for generate_lead", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("generate_lead", { value: 1000 }, mockContext);

      expect(window.wcs.cnv).toBe("4,1000");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '5,{value}' and call wcs_do for begin_checkout", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("begin_checkout", { currency: "KRW", value: 15000 }, mockContext);

      expect(window.wcs.cnv).toBe("5,15000");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should set wcs.cnv to '5,{value}' and call wcs_do for add_payment_info", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("add_payment_info", { currency: "KRW", value: 15000 }, mockContext);

      expect(window.wcs.cnv).toBe("5,15000");
      expect(window.wcs_do).toHaveBeenCalledTimes(1);
    });

    it("should use '0' as value when value is absent", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.wcs.cnv).toBe("2,0");
    });

    it("should not call wcs_do for unmapped events", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.wcs_do).not.toHaveBeenCalled();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when wcs is not defined", () => {
      const plugin = createNaverAdPlugin();

      expect(() =>
        plugin.track("purchase", { currency: "KRW", value: 1000, items: [] }, mockContext),
      ).not.toThrow();
    });

    it("should not throw when wcs_do is not defined", () => {
      window.wcs = { inflow: vi.fn(), cnv: undefined };
      const plugin = createNaverAdPlugin();

      expect(() =>
        plugin.track("purchase", { currency: "KRW", value: 1000, items: [] }, mockContext),
      ).not.toThrow();
    });
  });
});
