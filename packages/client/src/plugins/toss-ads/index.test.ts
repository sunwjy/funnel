import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTossAdsPlugin } from "./index";

const mockPixelInstance = {
  pageView: vi.fn(),
  viewHome: vi.fn(),
  productView: vi.fn(),
  addToCart: vi.fn(),
  addToWishlist: vi.fn(),
  initiateCheckout: vi.fn(),
  purchase: vi.fn(),
  search: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  lead: vi.fn(),
};

describe("createTossAdsPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const fn of Object.values(mockPixelInstance)) {
      fn.mockReset();
    }
    // @ts-expect-error — reset global
    delete window.TossPixel;
  });

  it("should have name 'toss-ads'", () => {
    const plugin = createTossAdsPlugin();
    expect(plugin.name).toBe("toss-ads");
  });

  it("should not expose setUser (Toss has no identify API)", () => {
    const plugin = createTossAdsPlugin();
    expect(plugin.setUser).toBeUndefined();
  });

  describe("track — SSR safety", () => {
    it("should not throw when TossPixel is not defined", () => {
      const plugin = createTossAdsPlugin();
      plugin.initialize({ conversionCode: "CONV123" });

      expect(() => plugin.track("page_view", {}, mockContext)).not.toThrow();
    });

    it("should not call anything when conversionCode is not set", () => {
      window.TossPixel = vi.fn(() => mockPixelInstance);
      const plugin = createTossAdsPlugin();
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);

      expect(window.TossPixel).not.toHaveBeenCalled();
    });
  });

  describe("track — event mapping", () => {
    let plugin: ReturnType<typeof createTossAdsPlugin>;

    beforeEach(() => {
      window.TossPixel = vi.fn(() => mockPixelInstance);
      plugin = createTossAdsPlugin();
      plugin.initialize({ conversionCode: "CONV123" });
    });

    it("should map page_view to pageView() with eventId in custom_param1", () => {
      plugin.track("page_view", {}, mockContext);

      expect(window.TossPixel).toHaveBeenCalledWith("CONV123");
      expect(mockPixelInstance.pageView).toHaveBeenCalledTimes(1);
      expect(mockPixelInstance.pageView).toHaveBeenCalledWith({ custom_param1: "test-event-id" });
    });

    it("should cache the TossPixel instance across calls", () => {
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);

      expect(window.TossPixel).toHaveBeenCalledTimes(1);
      expect(mockPixelInstance.pageView).toHaveBeenCalledTimes(3);
    });

    it("should map view_item to productView() using the first item", () => {
      plugin.track(
        "view_item",
        {
          currency: "KRW",
          items: [
            {
              item_id: "P12345",
              item_name: "Organic Tee",
              item_category: "Tops",
              price: 39000,
            },
            { item_id: "P2", item_name: "Other" },
          ],
        },
        mockContext,
      );

      expect(mockPixelInstance.productView).toHaveBeenCalledWith({
        product_id: "P12345",
        product_name: "Organic Tee",
        category_id: "Tops",
        category_name: "Tops",
        price: 39000,
        currency: "KRW",
        custom_param1: "test-event-id",
      });
    });

    it("should default currency to KRW for view_item", () => {
      plugin.track("view_item", { items: [{ item_id: "P1", item_name: "Item" }] }, mockContext);

      expect(mockPixelInstance.productView).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "KRW" }),
      );
    });

    it("should map add_to_cart to addToCart() with products and total_quantity", () => {
      plugin.track(
        "add_to_cart",
        {
          currency: "KRW",
          value: 78000,
          items: [{ item_id: "P1", item_name: "Tee", price: 39000, quantity: 2 }],
        },
        mockContext,
      );

      expect(mockPixelInstance.addToCart).toHaveBeenCalledWith({
        currency: "KRW",
        revenue: 78000,
        total_quantity: 2,
        products: [{ product_id: "P1", product_name: "Tee", price: 39000, quantity: 2 }],
        custom_param1: "test-event-id",
      });
    });

    it("should map add_to_wishlist to addToWishlist()", () => {
      plugin.track(
        "add_to_wishlist",
        { items: [{ item_id: "P1", item_name: "Tee", price: 1000 }] },
        mockContext,
      );

      expect(mockPixelInstance.addToWishlist).toHaveBeenCalledTimes(1);
    });

    it("should map begin_checkout to initiateCheckout() with order_id", () => {
      plugin.track(
        "begin_checkout",
        {
          currency: "KRW",
          value: 50000,
          transaction_id: "ORDER-1",
          items: [{ item_id: "P1", item_name: "Tee", price: 50000, quantity: 1 }],
        },
        mockContext,
      );

      expect(mockPixelInstance.initiateCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: "ORDER-1",
          revenue: 50000,
          currency: "KRW",
          total_quantity: 1,
        }),
      );
    });

    it("should map purchase() transforming items into the products array", () => {
      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 78000,
          transaction_id: "ORDER_20260423_0001",
          items: [
            {
              item_id: "P12345",
              item_name: "Organic Tee",
              item_category: "Tops",
              price: 39000,
              quantity: 1,
            },
            { item_id: "P2", item_name: "Cap", price: 39000, quantity: 1 },
          ],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith({
        order_id: "ORDER_20260423_0001",
        revenue: 78000,
        total_quantity: 2,
        currency: "KRW",
        products: [
          {
            product_id: "P12345",
            product_name: "Organic Tee",
            category_id: "Tops",
            category_name: "Tops",
            price: 39000,
            quantity: 1,
          },
          { product_id: "P2", product_name: "Cap", price: 39000, quantity: 1 },
        ],
        custom_param1: "test-event-id",
      });
    });

    it("should compute revenue from products when value is absent", () => {
      plugin.track(
        "purchase",
        {
          currency: "KRW",
          transaction_id: "ORDER-X",
          items: [{ item_id: "P1", item_name: "Tee", price: 10000, quantity: 3 }],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({ revenue: 30000, total_quantity: 3 }),
      );
    });

    it("should default currency to KRW for purchase when not provided", () => {
      plugin.track(
        "purchase",
        {
          value: 5000,
          transaction_id: "ORDER-Y",
          items: [{ item_id: "P1", item_name: "Item" }],
        },
        mockContext,
      );

      expect(mockPixelInstance.purchase).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "KRW" }),
      );
    });

    it("should map search to search() with the keyword in custom_param2", () => {
      plugin.track("search", { search_term: "running shoes" }, mockContext);

      expect(mockPixelInstance.search).toHaveBeenCalledWith({
        custom_param1: "test-event-id",
        custom_param2: "running shoes",
      });
    });

    it("should map sign_up to signUp()", () => {
      plugin.track("sign_up", { method: "email" }, mockContext);

      expect(mockPixelInstance.signUp).toHaveBeenCalledWith({ custom_param1: "test-event-id" });
    });

    it("should map login to signIn()", () => {
      plugin.track("login", { method: "email" }, mockContext);

      expect(mockPixelInstance.signIn).toHaveBeenCalledWith({ custom_param1: "test-event-id" });
    });

    it("should map generate_lead to lead() with revenue", () => {
      plugin.track("generate_lead", { currency: "KRW", value: 1000 }, mockContext);

      expect(mockPixelInstance.lead).toHaveBeenCalledWith({
        custom_param1: "test-event-id",
        revenue: 1000,
        currency: "KRW",
      });
    });

    it("should silently drop unmapped events (view_item_list)", () => {
      plugin.track("view_item_list", { item_list_id: "homepage_recs" }, mockContext);

      for (const fn of Object.values(mockPixelInstance)) {
        expect(fn).not.toHaveBeenCalled();
      }
    });

    it("should not throw for unmapped events (refund)", () => {
      expect(() =>
        plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext),
      ).not.toThrow();
      expect(mockPixelInstance.purchase).not.toHaveBeenCalled();
    });
  });
});
