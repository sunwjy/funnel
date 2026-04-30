import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAmplitudePlugin } from "./index";

const TEST_EVENT_ID = "test-event-id";
const mockContext = { eventId: TEST_EVENT_ID };

function mockAmplitude() {
  window.amplitude = {
    init: vi.fn(),
    track: vi.fn(),
    setUserId: vi.fn(),
    identify: vi.fn(),
  };
}

describe("createAmplitudePlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.amplitude;
  });

  it("should have name 'amplitude'", () => {
    const plugin = createAmplitudePlugin();
    expect(plugin.name).toBe("amplitude");
  });

  describe("initialize", () => {
    it("should call amplitude.init with apiKey", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.initialize({ apiKey: "test-api-key" });

      expect(window.amplitude.init).toHaveBeenCalledWith("test-api-key");
    });

    it("should forward options to amplitude.init", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.initialize({ apiKey: "test-api-key", options: { serverZone: "EU" } });

      expect(window.amplitude.init).toHaveBeenCalledWith("test-api-key", { serverZone: "EU" });
    });

    it("should not call amplitude.init when apiKey is absent", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.initialize({});

      expect(window.amplitude.init).not.toHaveBeenCalled();
    });

    it("should not throw when amplitude is not defined (SSR)", () => {
      const plugin = createAmplitudePlugin();

      expect(() => plugin.initialize({ apiKey: "test-api-key" })).not.toThrow();
    });
  });

  describe("track — event name mapping", () => {
    it("should send page_view as 'Page View' with insert_id", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.amplitude.track).toHaveBeenCalledWith("Page View", {
        insert_id: TEST_EVENT_ID,
      });
    });

    it("should send purchase as 'Purchase' with revenue instead of value and insert_id", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2 }],
        },
        mockContext,
      );

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          revenue: 29000,
          item_ids: ["SKU1"],
          item_names: ["Shoes"],
          num_items: 1,
          insert_id: TEST_EVENT_ID,
        }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.value).toBeUndefined();
    });

    it("should send refund as 'Refund' with revenue instead of value", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("refund", { currency: "USD", value: 5000 }, mockContext);

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Refund",
        expect.objectContaining({ revenue: 5000 }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.value).toBeUndefined();
    });

    it("should send add_to_cart as 'Add To Cart' keeping value as-is", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Add To Cart",
        expect.objectContaining({ currency: "USD", value: 50 }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.revenue).toBeUndefined();
    });

    it("should send search as 'Search' with search_term passed through", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("search", { search_term: "running shoes" }, mockContext);

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Search",
        expect.objectContaining({ search_term: "running shoes" }),
      );
    });
  });

  describe("track — item flattening", () => {
    it("should flatten items to item_ids, item_names, and num_items", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        mockContext,
      );

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "View Item",
        expect.objectContaining({
          item_ids: ["A", "B"],
          item_names: ["Item A", "Item B"],
          num_items: 2,
        }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.items).toBeUndefined();
    });

    it("should not include item fields when items is empty", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.item_ids).toBeUndefined();
      expect(params.item_names).toBeUndefined();
      expect(params.num_items).toBeUndefined();
    });

    it("should pass through non-item properties like currency", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.track("begin_checkout", { currency: "EUR", value: 120 }, mockContext);

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Begin Checkout",
        expect.objectContaining({ currency: "EUR", value: 120 }),
      );
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when amplitude is not available", () => {
      const plugin = createAmplitudePlugin();

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "KRW", value: 1000, transaction_id: "T-1" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call amplitude.setUserId with user_id", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.setUser?.({ user_id: "user-123" });

      expect(window.amplitude.setUserId).toHaveBeenCalledWith("user-123");
    });

    it("should call amplitude.identify with remaining properties", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.setUser?.({ user_id: "user-123", email: "test@example.com", plan: "pro" });

      expect(window.amplitude.identify).toHaveBeenCalledWith({
        email: "test@example.com",
        plan: "pro",
      });
    });

    it("should not throw in SSR", () => {
      const plugin = createAmplitudePlugin();

      expect(() => plugin.setUser?.({ user_id: "user-123" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should call amplitude.setUserId(null)", () => {
      mockAmplitude();
      const plugin = createAmplitudePlugin();

      plugin.resetUser?.();

      expect(window.amplitude.setUserId).toHaveBeenCalledWith(null);
    });
  });
});
