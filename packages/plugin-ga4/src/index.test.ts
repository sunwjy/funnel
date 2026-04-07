import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGA4Plugin } from "./index";

describe("createGA4Plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.gtag;
  });

  it("should have name 'ga4'", () => {
    const plugin = createGA4Plugin();
    expect(plugin.name).toBe("ga4");
  });

  describe("initialize", () => {
    it("should call gtag config with measurementId", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.initialize({ measurementId: "G-TEST123" });

      expect(window.gtag).toHaveBeenCalledWith("config", "G-TEST123");
    });

    it("should not call gtag when measurementId is absent", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.initialize({});

      expect(window.gtag).not.toHaveBeenCalled();
    });

    it("should not throw when gtag is not defined", () => {
      const plugin = createGA4Plugin();

      expect(() => plugin.initialize({ measurementId: "G-TEST" })).not.toThrow();
    });
  });

  describe("track", () => {
    it("should call gtag event with event name and params", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      const params = { currency: "KRW", value: 29000 };
      plugin.track("purchase", params);

      expect(window.gtag).toHaveBeenCalledWith("event", "purchase", params);
    });

    it("should silently skip when gtag is not available", () => {
      const plugin = createGA4Plugin();

      expect(() => plugin.track("page_view", {})).not.toThrow();
    });
  });
});
