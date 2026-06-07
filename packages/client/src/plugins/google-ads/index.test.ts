import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoogleAdsPlugin } from "./index";

describe("createGoogleAdsPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.gtag;
  });

  it("should have name 'google-ads'", () => {
    const plugin = createGoogleAdsPlugin();
    expect(plugin.name).toBe("google-ads");
  });

  describe("initialize", () => {
    it("should call gtag config with conversionId when provided", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({ conversionId: "AW-123456789" });

      expect(window.gtag).toHaveBeenCalledWith("config", "AW-123456789");
    });

    it("should not call gtag when conversionId is absent", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      expect(window.gtag).not.toHaveBeenCalled();
    });

    it("should not throw when gtag is not defined", () => {
      const plugin = createGoogleAdsPlugin();

      expect(() => plugin.initialize({ conversionId: "AW-123" })).not.toThrow();
    });
  });

  describe("track — conversion label", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should send conversion event with send_to when label is configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({
        conversionId: "AW-123",
        conversionLabels: { purchase: "abc123" },
      });

      plugin.track("purchase", { currency: "USD", value: 100, transaction_id: "T-1" }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith(
        "event",
        "conversion",
        expect.objectContaining({
          send_to: "AW-123/abc123",
          value: 100,
          currency: "USD",
          transaction_id: "T-1",
        }),
      );
    });

    it("should include value and currency for generate_lead with label", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({
        conversionId: "AW-123",
        conversionLabels: { generate_lead: "lead_label" },
      });

      plugin.track("generate_lead", { currency: "EUR", value: 50 }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith(
        "event",
        "conversion",
        expect.objectContaining({
          send_to: "AW-123/lead_label",
          value: 50,
          currency: "EUR",
        }),
      );
    });

    it("should include value and currency for sign_up with label", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({
        conversionId: "AW-123",
        conversionLabels: { sign_up: "signup_label" },
      });

      plugin.track("sign_up", { method: "email" }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "conversion", expect.any(Object));
    });

    it("should not send any event when label is set but conversionId is absent", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({
        conversionLabels: { purchase: "abc123" },
      });

      plugin.track("purchase", { currency: "USD", value: 100, transaction_id: "T-1" }, mockContext);

      // Without conversionId there is no send_to target — sending a bare
      // gtag event would be routed to ALL configured gtag destinations
      // (e.g., GA4) and double-count alongside the ga4 plugin.
      expect(window.gtag).not.toHaveBeenCalled();
    });
  });

  describe("track — events without labels are dropped (no GA4 double-counting)", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should not send purchase when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({ conversionId: "AW-123" });

      plugin.track(
        "purchase",
        { currency: "KRW", value: 29000, transaction_id: "T-2" },
        mockContext,
      );

      // initialize() legitimately calls gtag("config", ...) — only assert
      // that no *event* was dispatched.
      expect(window.gtag).not.toHaveBeenCalledWith("event", expect.anything(), expect.anything());
    });

    it("should not send add_to_cart when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.gtag).not.toHaveBeenCalled();
    });

    it("should not send page_view when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);

      expect(window.gtag).not.toHaveBeenCalled();
    });

    it("should not send unmapped events when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("search", { search_term: "shoes" }, mockContext);

      expect(window.gtag).not.toHaveBeenCalled();
    });
  });

  describe("track — SSR safety", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should not throw when gtag is not available", () => {
      const plugin = createGoogleAdsPlugin();

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "KRW", value: 1000, transaction_id: "T-3" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call gtag set user_data with email and phone", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });

      expect(window.gtag).toHaveBeenCalledWith("set", "user_data", {
        email: "test@example.com",
        phone_number: "+821012345678",
      });
    });

    it("should nest first_name and last_name under address", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.setUser?.({ first_name: "Jane", last_name: "Doe" });

      expect(window.gtag).toHaveBeenCalledWith("set", "user_data", {
        address: { first_name: "Jane", last_name: "Doe" },
      });
    });

    it("should not throw in SSR", () => {
      const plugin = createGoogleAdsPlugin();

      expect(() => plugin.setUser?.({ email: "test@example.com" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should clear enhanced-conversions user_data on logout", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.setUser?.({ email: "test@example.com" });
      plugin.resetUser?.();

      expect(window.gtag).toHaveBeenCalledWith("set", "user_data", null);
    });

    it("should not throw in SSR", () => {
      const plugin = createGoogleAdsPlugin();

      expect(() => plugin.resetUser?.()).not.toThrow();
    });
  });
});
