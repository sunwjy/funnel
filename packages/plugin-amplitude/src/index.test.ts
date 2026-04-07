import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAmplitudePlugin } from "./index";

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
    it("should call amplitude.init with apiKey when provided", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.initialize({ apiKey: "test-api-key" });

      expect(window.amplitude.init).toHaveBeenCalledWith("test-api-key");
    });

    it("should not call amplitude.init when apiKey is absent", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
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
    it("should send page_view as 'Page View'", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("page_view", {});

      expect(window.amplitude.track).toHaveBeenCalledWith("Page View", expect.any(Object));
    });

    it("should send purchase as 'Purchase' with revenue instead of value", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("purchase", {
        currency: "KRW",
        value: 29000,
        items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2 }],
      });

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          revenue: 29000,
          item_ids: ["SKU1"],
          item_names: ["Shoes"],
          num_items: 1,
        }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.value).toBeUndefined();
    });

    it("should send refund as 'Refund' with revenue instead of value", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("refund", { currency: "USD", value: 5000 });

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Refund",
        expect.objectContaining({ revenue: 5000 }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.value).toBeUndefined();
    });

    it("should send add_to_cart as 'Add To Cart' keeping value as-is", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 });

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Add To Cart",
        expect.objectContaining({ currency: "USD", value: 50 }),
      );
      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.revenue).toBeUndefined();
    });

    it("should send search as 'Search' with search_term passed through", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("search", { search_term: "running shoes" });

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Search",
        expect.objectContaining({ search_term: "running shoes" }),
      );
    });
  });

  describe("track — item flattening", () => {
    it("should flatten items to item_ids, item_names, and num_items", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("view_item", {
        items: [
          { item_id: "A", item_name: "Item A", quantity: 3 },
          { item_id: "B", item_name: "Item B" },
        ],
      });

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
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("view_item", { items: [] });

      const params = (window.amplitude.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.item_ids).toBeUndefined();
      expect(params.item_names).toBeUndefined();
      expect(params.num_items).toBeUndefined();
    });

    it("should pass through non-item properties like currency", () => {
      window.amplitude = { init: vi.fn(), track: vi.fn() };
      const plugin = createAmplitudePlugin();

      plugin.track("begin_checkout", { currency: "EUR", value: 120 });

      expect(window.amplitude.track).toHaveBeenCalledWith(
        "Begin Checkout",
        expect.objectContaining({ currency: "EUR", value: 120 }),
      );
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when amplitude is not available", () => {
      const plugin = createAmplitudePlugin();

      expect(() => plugin.track("purchase", { currency: "KRW", value: 1000 })).not.toThrow();
    });
  });
});
