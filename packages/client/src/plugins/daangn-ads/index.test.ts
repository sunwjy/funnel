import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDaangnAdsPlugin } from "./index";

const mockKarrotPixel = {
  init: vi.fn(),
  track: vi.fn(),
};

describe("createDaangnAdsPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockKarrotPixel.init.mockReset();
    mockKarrotPixel.track.mockReset();
    // @ts-expect-error — reset global
    delete window.karrotPixel;
  });

  it("should have name 'daangn-ads'", () => {
    const plugin = createDaangnAdsPlugin();
    expect(plugin.name).toBe("daangn-ads");
  });

  describe("track — SSR safety", () => {
    it("should not throw when karrotPixel is not defined", () => {
      const plugin = createDaangnAdsPlugin();
      plugin.initialize({ trackId: "DAANGN-1234" });

      expect(() => plugin.track("page_view", {}, mockContext)).not.toThrow();
    });

    it("should not call anything when trackId is not set", () => {
      window.karrotPixel = mockKarrotPixel;
      const plugin = createDaangnAdsPlugin();
      plugin.initialize({});

      plugin.track("page_view", {}, mockContext);

      expect(mockKarrotPixel.init).not.toHaveBeenCalled();
      expect(mockKarrotPixel.track).not.toHaveBeenCalled();
    });
  });

  describe("track — event mapping", () => {
    let plugin: ReturnType<typeof createDaangnAdsPlugin>;

    beforeEach(() => {
      window.karrotPixel = mockKarrotPixel;
      plugin = createDaangnAdsPlugin();
      plugin.initialize({ trackId: "DAANGN-1234" });
    });

    it("should init the pixel with trackId on first track call", () => {
      plugin.track("page_view", {}, mockContext);

      expect(mockKarrotPixel.init).toHaveBeenCalledWith("DAANGN-1234");
    });

    it("should map page_view to track('ViewPage')", () => {
      plugin.track("page_view", {}, mockContext);

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("ViewPage");
    });

    it("should init only once across multiple track calls", () => {
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);
      plugin.track("page_view", {}, mockContext);

      expect(mockKarrotPixel.init).toHaveBeenCalledTimes(1);
      expect(mockKarrotPixel.track).toHaveBeenCalledTimes(3);
    });

    it("should map view_item to track('ViewContent', { id }) using first item", () => {
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

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("ViewContent", { id: "SKU1" });
    });

    it("should map view_item with no items to track('ViewContent', { id: '' })", () => {
      plugin.track("view_item", {}, mockContext);

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("ViewContent", { id: "" });
    });

    it("should map add_to_cart to track('AddToCart', { products })", () => {
      plugin.track(
        "add_to_cart",
        {
          items: [{ item_id: "SKU3", item_name: "Hat", quantity: 2, price: 15000 }],
        },
        mockContext,
      );

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("AddToCart", {
        products: [{ id: "SKU3", name: "Hat", quantity: 2, price: 15000 }],
      });
    });

    it("should default product quantity to 1 and price to 0 when missing", () => {
      plugin.track(
        "add_to_cart",
        {
          items: [{ item_id: "SKU4", item_name: "Mug" }],
        },
        mockContext,
      );

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("AddToCart", {
        products: [{ id: "SKU4", name: "Mug", quantity: 1, price: 0 }],
      });
    });

    it("should map sign_up to track('CompleteRegistration')", () => {
      plugin.track("sign_up", {}, mockContext);

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("CompleteRegistration");
    });

    it("should map purchase computing total_price/total_quantity from products as strings", () => {
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

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("Purchase", {
        total_price: "29000", // 2*10000 + 1*9000
        total_quantity: "3",
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
          currency: "KRW",
          value: 50000,
          transaction_id: "T-2",
          items: [{ item_id: "SKU1", item_name: "Widget" }],
        },
        mockContext,
      );

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("Purchase", {
        total_price: "50000",
        total_quantity: "1",
        products: [{ id: "SKU1", name: "Widget", quantity: 1, price: 0 }],
      });
    });

    it("should send total_price '0' when no products and no value", () => {
      plugin.track("purchase", { transaction_id: "T-3" }, mockContext);

      expect(mockKarrotPixel.track).toHaveBeenCalledWith("Purchase", {
        total_price: "0",
        total_quantity: "0",
        products: [],
      });
    });

    it("should silently drop view_item_list (no Daangn equivalent)", () => {
      plugin.track("view_item_list", { item_list_id: "homepage_recs" }, mockContext);

      expect(mockKarrotPixel.track).not.toHaveBeenCalled();
    });

    it("should silently drop search (no Daangn equivalent)", () => {
      plugin.track("search", { search_term: "running shoes" }, mockContext);

      expect(mockKarrotPixel.track).not.toHaveBeenCalled();
    });

    it("should not throw for unmapped events", () => {
      expect(() =>
        plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext),
      ).not.toThrow();
      expect(mockKarrotPixel.track).not.toHaveBeenCalled();
    });
  });
});
