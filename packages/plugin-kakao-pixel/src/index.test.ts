import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKakaoPixelPlugin } from "./index";

const mockPixelInstance = {
  pageView: vi.fn(),
  search: vi.fn(),
  viewContent: vi.fn(),
  viewCart: vi.fn(),
  addToCart: vi.fn(),
  purchase: vi.fn(),
  completeRegistration: vi.fn(),
  participation: vi.fn(),
};

describe("createKakaoPixelPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    for (const fn of Object.values(mockPixelInstance)) {
      fn.mockReset();
    }
    // @ts-expect-error — reset global
    delete window.kakaoPixel;
  });

  it("should have name 'kakao-pixel'", () => {
    const plugin = createKakaoPixelPlugin();
    expect(plugin.name).toBe("kakao-pixel");
  });

  describe("track — SSR safety", () => {
    it("should not throw when kakaoPixel is not defined", () => {
      const plugin = createKakaoPixelPlugin();
      plugin.initialize({ trackId: "1234567890" });

      expect(() => plugin.track("page_view", {})).not.toThrow();
    });

    it("should not call anything when trackId is not set", () => {
      window.kakaoPixel = vi.fn(() => mockPixelInstance);
      const plugin = createKakaoPixelPlugin();
      plugin.initialize({});

      plugin.track("page_view", {});

      expect(window.kakaoPixel).not.toHaveBeenCalled();
    });
  });

  describe("track — event mapping", () => {
    let plugin: ReturnType<typeof createKakaoPixelPlugin>;

    beforeEach(() => {
      window.kakaoPixel = vi.fn(() => mockPixelInstance);
      plugin = createKakaoPixelPlugin();
      plugin.initialize({ trackId: "1234567890" });
    });

    it("should map page_view to pageView()", () => {
      plugin.track("page_view", {});

      expect(window.kakaoPixel).toHaveBeenCalledWith("1234567890");
      expect(mockPixelInstance.pageView).toHaveBeenCalledTimes(1);
    });

    it("should map search to search({ keyword })", () => {
      plugin.track("search", { search_term: "running shoes" });

      expect(mockPixelInstance.search).toHaveBeenCalledWith({ keyword: "running shoes" });
    });

    it("should map view_item to viewContent({ id }) using first item", () => {
      plugin.track("view_item", {
        items: [
          { item_id: "SKU1", item_name: "Shirt" },
          { item_id: "SKU2", item_name: "Pants" },
        ],
      });

      expect(mockPixelInstance.viewContent).toHaveBeenCalledWith({ id: "SKU1" });
    });

    it("should map view_item_list to viewContent({ id: item_list_id })", () => {
      plugin.track("view_item_list", { item_list_id: "homepage_recs" });

      expect(mockPixelInstance.viewContent).toHaveBeenCalledWith({ id: "homepage_recs" });
    });

    it("should map add_to_cart to addToCart({ id }) using first item", () => {
      plugin.track("add_to_cart", {
        items: [{ item_id: "SKU3", item_name: "Hat" }],
      });

      expect(mockPixelInstance.addToCart).toHaveBeenCalledWith({ id: "SKU3" });
    });

    it("should map begin_checkout to viewCart()", () => {
      plugin.track("begin_checkout", { currency: "KRW", value: 50000 });

      expect(mockPixelInstance.viewCart).toHaveBeenCalledTimes(1);
    });

    it("should map purchase to purchase() with products, total_quantity, total_price, currency", () => {
      plugin.track("purchase", {
        currency: "KRW",
        value: 29000,
        items: [
          { item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 10000 },
          { item_id: "SKU2", item_name: "Socks", quantity: 1, price: 9000 },
        ],
      });

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith({
        total_quantity: 3,
        total_price: 29000,
        currency: "KRW",
        products: [
          { id: "SKU1", name: "Shoes", quantity: 2, price: 10000 },
          { id: "SKU2", name: "Socks", quantity: 1, price: 9000 },
        ],
      });
    });

    it("should default quantity to 1 and price to 0 for purchase items without those fields", () => {
      plugin.track("purchase", {
        currency: "USD",
        value: 100,
        items: [{ item_id: "SKU1", item_name: "Widget" }],
      });

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [{ id: "SKU1", name: "Widget", quantity: 1, price: 0 }],
          total_quantity: 1,
        }),
      );
    });

    it("should default currency to KRW when not provided in purchase", () => {
      plugin.track("purchase", {
        value: 5000,
        items: [{ item_id: "SKU1", item_name: "Item" }],
      });

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "KRW" }),
      );
    });

    it("should map sign_up to completeRegistration()", () => {
      plugin.track("sign_up", {});

      expect(mockPixelInstance.completeRegistration).toHaveBeenCalledTimes(1);
    });

    it("should map generate_lead to participation()", () => {
      plugin.track("generate_lead", {});

      expect(mockPixelInstance.participation).toHaveBeenCalledTimes(1);
    });

    it("should not throw for unmapped events", () => {
      expect(() => plugin.track("refund", { currency: "KRW", value: 5000 })).not.toThrow();
      expect(mockPixelInstance.pageView).not.toHaveBeenCalled();
      expect(mockPixelInstance.purchase).not.toHaveBeenCalled();
    });
  });
});
