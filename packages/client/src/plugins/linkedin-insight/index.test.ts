import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLinkedInInsightPlugin } from "./index";

describe("createLinkedInInsightPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.lintrk;
    // @ts-expect-error — reset global
    delete window._linkedin_data_partner_ids;
  });

  it("should have name 'linkedin-insight'", () => {
    const plugin = createLinkedInInsightPlugin();
    expect(plugin.name).toBe("linkedin-insight");
  });

  describe("initialize", () => {
    it("should push partnerId to _linkedin_data_partner_ids", () => {
      window._linkedin_data_partner_ids = [];
      const plugin = createLinkedInInsightPlugin();

      plugin.initialize({ partnerId: "123456" });

      expect(window._linkedin_data_partner_ids).toContain("123456");
    });

    it("should create _linkedin_data_partner_ids array if it does not exist", () => {
      const plugin = createLinkedInInsightPlugin();

      plugin.initialize({ partnerId: "123456" });

      expect(window._linkedin_data_partner_ids).toEqual(["123456"]);
    });

    it("should not duplicate the partnerId when initialize is called twice", () => {
      const plugin = createLinkedInInsightPlugin();

      plugin.initialize({ partnerId: "123456" });
      plugin.initialize({ partnerId: "123456" });

      expect(window._linkedin_data_partner_ids).toEqual(["123456"]);
    });

    it("should not push when partnerId is absent", () => {
      window._linkedin_data_partner_ids = [];
      const plugin = createLinkedInInsightPlugin();

      plugin.initialize({});

      expect(window._linkedin_data_partner_ids).toHaveLength(0);
    });
  });

  describe("track", () => {
    it("should not call lintrk for page_view (auto-tracked)", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { page_view: 999 } });

      plugin.track("page_view", {}, mockContext);

      expect(window.lintrk).not.toHaveBeenCalled();
    });

    it("should call lintrk with conversion_id only when no value/currency present", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { sign_up: 200 } });

      plugin.track("sign_up", {}, mockContext);

      expect(window.lintrk).toHaveBeenCalledWith("track", { conversion_id: 200 });
    });

    it("should include value object when both value and currency are provided", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      plugin.track("purchase", { currency: "USD", value: 99, transaction_id: "T-1" }, mockContext);

      expect(window.lintrk).toHaveBeenCalledWith("track", {
        conversion_id: 123,
        value: { currency: "USD", amount: 99 },
      });
    });

    it("should not call lintrk for events without a configured conversion ID", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.lintrk).not.toHaveBeenCalled();
    });

    it("should warn for unmapped non-page_view events when debug is enabled", () => {
      window.lintrk = vi.fn();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ debug: true });

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(warn).toHaveBeenCalled();
    });

    it("should not warn for unmapped events when debug is off", () => {
      window.lintrk = vi.fn();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({});

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(warn).not.toHaveBeenCalled();
    });

    it("should not throw when lintrk is not defined (SSR safety)", () => {
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "USD", value: 50, transaction_id: "T-1" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });
});
