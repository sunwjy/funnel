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
    const mockContext = { eventId: "test-event-id" };

    it("should call gtag event with event name and params", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      const params = { currency: "KRW", value: 29000 };
      plugin.track("purchase", params, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "purchase", params);
    });

    it("should silently skip when gtag is not available", () => {
      const plugin = createGA4Plugin();

      expect(() => plugin.track("page_view", {}, mockContext)).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call gtag set with user_id", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.setUser?.({ user_id: "abc123" });

      expect(window.gtag).toHaveBeenCalledWith("set", { user_id: "abc123" });
    });

    it("should call gtag set user_properties for non-id fields", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.setUser?.({ email: "user@example.com", phone_number: "+1234567890" });

      expect(window.gtag).toHaveBeenCalledWith("set", "user_properties", {
        email: "user@example.com",
        phone_number: "+1234567890",
      });
    });

    it("should handle both user_id and user_properties together", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.setUser?.({ user_id: "abc123", email: "user@example.com", first_name: "Jane" });

      expect(window.gtag).toHaveBeenCalledWith("set", { user_id: "abc123" });
      expect(window.gtag).toHaveBeenCalledWith("set", "user_properties", {
        email: "user@example.com",
        first_name: "Jane",
      });
    });

    it("should not throw when window.gtag is not defined (SSR)", () => {
      const plugin = createGA4Plugin();

      expect(() => plugin.setUser?.({ user_id: "abc123" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should set user_id to null", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.resetUser?.();

      expect(window.gtag).toHaveBeenCalledWith("set", { user_id: null });
    });
  });
});
