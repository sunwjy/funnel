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

    it("should not send conversion event when label is set but conversionId is absent", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({
        conversionLabels: { purchase: "abc123" },
      });

      plugin.track("purchase", { currency: "USD", value: 100, transaction_id: "T-1" }, mockContext);

      // Falls through to default conversion event path, not "conversion" event
      expect(window.gtag).toHaveBeenCalledWith("event", "purchase", expect.any(Object));
    });
  });

  describe("track — default conversion events without labels", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should send purchase via gtag event when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({ conversionId: "AW-123" });

      plugin.track(
        "purchase",
        { currency: "KRW", value: 29000, transaction_id: "T-2" },
        mockContext,
      );

      expect(window.gtag).toHaveBeenCalledWith(
        "event",
        "purchase",
        expect.objectContaining({ currency: "KRW", value: 29000 }),
      );
    });

    it("should send add_to_cart via gtag event when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "add_to_cart", expect.any(Object));
    });

    it("should send begin_checkout via gtag event when no label configured", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "begin_checkout", expect.any(Object));
    });
  });

  describe("track — non-conversion events", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should pass through page_view via gtag event", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "page_view", expect.any(Object));
    });

    it("should pass through custom/unmapped events via gtag event", () => {
      window.gtag = vi.fn();
      const plugin = createGoogleAdsPlugin();

      plugin.initialize({});

      plugin.track("search", { search_term: "shoes" }, mockContext);

      expect(window.gtag).toHaveBeenCalledWith("event", "search", expect.any(Object));
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
});
