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
  const mockContext = { eventId: "test-event-id" };

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

      expect(() => plugin.track("page_view", {}, mockContext)).not.toThrow();
    });

    it("should not call anything when trackId is not set", () => {
      window.kakaoPixel = vi.fn(() => mockPixelInstance);
      const plugin = createKakaoPixelPlugin();
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);

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
      plugin.track("page_view", {}, mockContext);

      expect(window.kakaoPixel).toHaveBeenCalledWith("1234567890");
      expect(mockPixelInstance.pageView).toHaveBeenCalledTimes(1);
    });

    it("should cache the kakaoPixel instance across calls", () => {
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);

      // factory called once; method called per track
      expect(window.kakaoPixel).toHaveBeenCalledTimes(1);
      expect(mockPixelInstance.pageView).toHaveBeenCalledTimes(3);
    });

    it("should map search to search({ keyword })", () => {
      plugin.track("search", { search_term: "running shoes" }, mockContext);

      expect(mockPixelInstance.search).toHaveBeenCalledWith({ keyword: "running shoes" });
    });

    it("should map view_item to viewContent({ id }) using first item", () => {
      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "SKU1", item_name: "Shirt" },
            { item_id: "SKU2", item_name: "Pants" },
          ],
        },
        mockContext,
      );

      expect(mockPixelInstance.viewContent).toHaveBeenCalledWith({ id: "SKU1" });
    });

    it("should silently drop view_item_list (no Kakao equivalent)", () => {
      plugin.track("view_item_list", { item_list_id: "homepage_recs" }, mockContext);

      expect(mockPixelInstance.viewContent).not.toHaveBeenCalled();
    });

    it("should map add_to_cart to addToCart({ id }) using first item", () => {
      plugin.track(
        "add_to_cart",
        {
          items: [{ item_id: "SKU3", item_name: "Hat" }],
        },
        mockContext,
      );

      expect(mockPixelInstance.addToCart).toHaveBeenCalledWith({ id: "SKU3" });
    });

    it("should map begin_checkout to viewCart()", () => {
      plugin.track("begin_checkout", { currency: "KRW", value: 50000 }, mockContext);

      expect(mockPixelInstance.viewCart).toHaveBeenCalledTimes(1);
    });

    it("should map view_cart to viewCart()", () => {
      plugin.track("view_cart", { currency: "KRW", value: 50000 }, mockContext);

      expect(mockPixelInstance.viewCart).toHaveBeenCalledTimes(1);
    });

    it("should map purchase computing total_price from products", () => {
      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 99999, // intentionally different from product sum to verify recompute
          transaction_id: "T-1",
          items: [
            { item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 10000 },
            { item_id: "SKU2", item_name: "Socks", quantity: 1, price: 9000 },
          ],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith({
        total_quantity: 3,
        total_price: 29000, // 2*10000 + 1*9000
        currency: "KRW",
        products: [
          { id: "SKU1", name: "Shoes", quantity: 2, price: 10000 },
          { id: "SKU2", name: "Socks", quantity: 1, price: 9000 },
        ],
      });
    });

    it("should fall back to params.value when per-item prices are missing", () => {
      plugin.track(
        "purchase",
        {
          currency: "USD",
          value: 100,
          transaction_id: "T-2",
          items: [{ item_id: "SKU1", item_name: "Widget" }],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [{ id: "SKU1", name: "Widget", quantity: 1, price: 0 }],
          total_quantity: 1,
          total_price: 100,
        }),
      );
    });

    it("should default currency to KRW when not provided in purchase", () => {
      plugin.track(
        "purchase",
        {
          value: 5000,
          transaction_id: "T-3",
          items: [{ item_id: "SKU1", item_name: "Item" }],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "KRW" }),
      );
    });

    it("should map sign_up to completeRegistration()", () => {
      plugin.track("sign_up", {}, mockContext);

      expect(mockPixelInstance.completeRegistration).toHaveBeenCalledTimes(1);
    });

    it("should map generate_lead to participation()", () => {
      plugin.track("generate_lead", {}, mockContext);

      expect(mockPixelInstance.participation).toHaveBeenCalledTimes(1);
    });

    it("should not throw for unmapped events", () => {
      expect(() =>
        plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext),
      ).not.toThrow();
      expect(mockPixelInstance.pageView).not.toHaveBeenCalled();
      expect(mockPixelInstance.purchase).not.toHaveBeenCalled();
    });
  });
});
