import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRedditPixelPlugin } from "./index";

describe("createRedditPixelPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  function mockRdt() {
    window.rdt = vi.fn();
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.rdt;
  });

  it("should have name 'reddit-pixel'", () => {
    const plugin = createRedditPixelPlugin();
    expect(plugin.name).toBe("reddit-pixel");
  });

  describe("initialize", () => {
    it("should call rdt('init', pixelId)", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.initialize({ pixelId: "t2_abc123" });

      expect(window.rdt).toHaveBeenCalledWith("init", "t2_abc123");
    });

    it("should not call rdt when pixelId is absent", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.initialize({});

      expect(window.rdt).not.toHaveBeenCalled();
    });

    it("should not throw when rdt is not defined (SSR)", () => {
      const plugin = createRedditPixelPlugin();

      expect(() => plugin.initialize({ pixelId: "t2_abc123" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to PageVisit", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "PageVisit",
        expect.objectContaining({ conversionId: "test-event-id" }),
      );
    });

    it("should map view_item to ViewContent", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("view_item", { currency: "USD", value: 25 }, mockContext);

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({ currency: "USD", value: 25, conversionId: "test-event-id" }),
      );
    });

    it("should map add_to_cart to AddToCart", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "AddToCart",
        expect.objectContaining({ currency: "USD", value: 50, conversionId: "test-event-id" }),
      );
    });

    it("should map add_to_wishlist to AddToWishlist", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("add_to_wishlist", { currency: "USD", value: 50 }, mockContext);

      expect(window.rdt).toHaveBeenCalledWith("track", "AddToWishlist", expect.any(Object));
    });

    it("should map generate_lead to Lead", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("generate_lead", {}, mockContext);

      expect(window.rdt).toHaveBeenCalledWith("track", "Lead", expect.any(Object));
    });

    it("should map sign_up to SignUp", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.rdt).toHaveBeenCalledWith("track", "SignUp", expect.any(Object));
    });

    it("should map search to Search with search param", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("search", { search_term: "sneakers" }, mockContext);

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "Search",
        expect.objectContaining({ search: "sneakers" }),
      );
    });

    it("should send unmapped events as Custom with customEventName", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "Custom",
        expect.objectContaining({
          currency: "KRW",
          value: 5000,
          customEventName: "refund",
          conversionId: "test-event-id",
        }),
      );
    });
  });

  describe("track — purchase transformation", () => {
    it("should map purchase to Purchase with products, itemCount, transactionId, value, currency", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [
            {
              item_id: "SKU1",
              item_name: "Shoes",
              item_category: "Footwear",
              quantity: 2,
              price: 14500,
            },
          ],
        },
        mockContext,
      );

      expect(window.rdt).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          transactionId: "T-1",
          itemCount: 2,
          conversionId: "test-event-id",
          products: [{ id: "SKU1", name: "Shoes", category: "Footwear" }],
        }),
      );
    });

    it("should sum quantities across multiple items and default missing quantity to 1", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track(
        "purchase",
        {
          transaction_id: "T-2",
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        mockContext,
      );

      const metadata = (window.rdt as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(metadata.itemCount).toBe(4);
      expect(metadata.products).toEqual([
        { id: "A", name: "Item A" },
        { id: "B", name: "Item B" },
      ]);
    });

    it("should not include products/itemCount when items is empty", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("purchase", { transaction_id: "T-3", items: [] }, mockContext);

      const metadata = (window.rdt as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(metadata.products).toBeUndefined();
      expect(metadata.itemCount).toBeUndefined();
    });
  });

  describe("track — conversionId dedup", () => {
    it("should always include conversionId from context.eventId", () => {
      mockRdt();
      const plugin = createRedditPixelPlugin();

      plugin.track("view_item", {}, { eventId: "dedup-123" });

      const metadata = (window.rdt as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(metadata.conversionId).toBe("dedup-123");
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when rdt is not available", () => {
      const plugin = createRedditPixelPlugin();

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "KRW", value: 1000, transaction_id: "T-1" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });
});
