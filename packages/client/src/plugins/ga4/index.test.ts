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

    it("should forward additional config object to gtag", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.initialize({
        measurementId: "G-TEST123",
        config: { send_page_view: false, debug_mode: true },
      });

      expect(window.gtag).toHaveBeenCalledWith("config", "G-TEST123", {
        send_page_view: false,
        debug_mode: true,
      });
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

    it("should call gtag event with event name, params, and event_id from context", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.track(
        "purchase",
        { currency: "KRW", value: 29000, transaction_id: "T-1" },
        mockContext,
      );

      expect(window.gtag).toHaveBeenCalledWith(
        "event",
        "purchase",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          event_id: "test-event-id",
        }),
      );
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

    it("should clear previously-set user_properties", () => {
      window.gtag = vi.fn();
      const plugin = createGA4Plugin();

      plugin.setUser?.({ email: "user@example.com", plan: "pro" });
      (window.gtag as ReturnType<typeof vi.fn>).mockClear();

      plugin.resetUser?.();

      expect(window.gtag).toHaveBeenCalledWith("set", { user_id: null });
      expect(window.gtag).toHaveBeenCalledWith("set", "user_properties", {
        email: null,
        plan: null,
      });
    });
  });
});
