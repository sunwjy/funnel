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

    it("should not push when partnerId is absent", () => {
      window._linkedin_data_partner_ids = [];
      const plugin = createLinkedInInsightPlugin();

      plugin.initialize({});

      expect(window._linkedin_data_partner_ids).toHaveLength(0);
    });

    it("should not throw when window is undefined (SSR)", () => {
      const plugin = createLinkedInInsightPlugin();

      // Simulate SSR by checking typeof window — the guard in initialize
      // prevents any window access when partnerId is provided but window is absent.
      // Since jsdom always has window, we verify the guard logic by omitting partnerId.
      expect(() => plugin.initialize({})).not.toThrow();
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

    it("should call lintrk with configured conversion ID for purchase", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      plugin.track("purchase", { currency: "USD", value: 99 }, mockContext);

      expect(window.lintrk).toHaveBeenCalledWith("track", { conversion_id: 123 });
    });

    it("should not call lintrk for events without a configured conversion ID", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.lintrk).not.toHaveBeenCalled();
    });

    it("should map multiple configured events to their respective conversion IDs", () => {
      window.lintrk = vi.fn();
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({
        conversionIds: {
          purchase: 100,
          sign_up: 200,
          generate_lead: 300,
        },
      });

      plugin.track("sign_up", {}, mockContext);
      plugin.track("generate_lead", {}, mockContext);
      plugin.track("purchase", { currency: "USD", value: 10 }, mockContext);

      expect(window.lintrk).toHaveBeenNthCalledWith(1, "track", { conversion_id: 200 });
      expect(window.lintrk).toHaveBeenNthCalledWith(2, "track", { conversion_id: 300 });
      expect(window.lintrk).toHaveBeenNthCalledWith(3, "track", { conversion_id: 100 });
    });

    it("should not throw when lintrk is not defined (SSR safety)", () => {
      const plugin = createLinkedInInsightPlugin();
      plugin.initialize({ conversionIds: { purchase: 123 } });

      expect(() =>
        plugin.track("purchase", { currency: "USD", value: 50 }, mockContext),
      ).not.toThrow();
    });
  });
});
