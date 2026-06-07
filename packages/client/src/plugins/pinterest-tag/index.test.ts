import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinterestTagPlugin } from "./index";

describe("createPinterestTagPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  function mockPintrk() {
    window.pintrk = vi.fn();
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.pintrk;
  });

  it("should have name 'pinterest-tag'", () => {
    const plugin = createPinterestTagPlugin();
    expect(plugin.name).toBe("pinterest-tag");
  });

  describe("initialize", () => {
    it("should call pintrk load and page with tagId", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.initialize({ tagId: "1234567890" });

      expect(window.pintrk).toHaveBeenCalledWith("load", "1234567890");
      expect(window.pintrk).toHaveBeenCalledWith("page");
    });

    it("should not call pintrk when tagId is absent", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.initialize({});

      expect(window.pintrk).not.toHaveBeenCalled();
    });

    it("should not throw when pintrk is not defined (SSR)", () => {
      const plugin = createPinterestTagPlugin();

      expect(() => plugin.initialize({ tagId: "1234567890" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to pagevisit", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "pagevisit",
        expect.objectContaining({ event_id: "test-event-id" }),
      );
    });

    it("should map view_item_list to viewcategory", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("view_item_list", {}, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith("track", "viewcategory", expect.any(Object));
    });

    it("should map search to search with search_query", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("search", { search_term: "sneakers" }, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "search",
        expect.objectContaining({ search_query: "sneakers", event_id: "test-event-id" }),
      );
    });

    it("should map add_to_cart to addtocart with value, currency, line_items", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track(
        "add_to_cart",
        {
          currency: "USD",
          value: 50,
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 25 }],
        },
        mockContext,
      );

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "addtocart",
        expect.objectContaining({
          currency: "USD",
          value: 50,
          event_id: "test-event-id",
          line_items: [
            {
              product_id: "SKU1",
              product_name: "Shoes",
              product_quantity: 2,
              product_price: 25,
            },
          ],
        }),
      );
    });

    it("should map sign_up to signup", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith("track", "signup", expect.any(Object));
    });

    it("should map generate_lead to lead", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("generate_lead", { currency: "USD", value: 10 }, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "lead",
        expect.objectContaining({ currency: "USD", value: 10 }),
      );
    });
  });

  describe("track — purchase to checkout", () => {
    it("should map purchase to checkout with order_id, order_quantity, line_items", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [
            { item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 },
            { item_id: "SKU2", item_name: "Socks", quantity: 3, price: 0 },
          ],
        },
        mockContext,
      );

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "checkout",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          order_id: "T-1",
          order_quantity: 5,
          event_id: "test-event-id",
          line_items: [
            {
              product_id: "SKU1",
              product_name: "Shoes",
              product_quantity: 2,
              product_price: 14500,
            },
            {
              product_id: "SKU2",
              product_name: "Socks",
              product_quantity: 3,
              product_price: 0,
            },
          ],
        }),
      );
    });

    it("should include product_category from item_category", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track(
        "view_item_list",
        {
          items: [{ item_id: "A", item_name: "Item A", item_category: "Footwear" }],
        },
        mockContext,
      );

      const data = (window.pintrk as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(data.line_items[0]).toMatchObject({
        product_id: "A",
        product_name: "Item A",
        product_quantity: 1,
        product_category: "Footwear",
      });
    });
  });

  describe("track — custom fallthrough", () => {
    it("should send begin_checkout as a custom event (not mapped to checkout)", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "custom",
        expect.objectContaining({
          event_name: "begin_checkout",
          currency: "USD",
          value: 100,
          event_id: "test-event-id",
        }),
      );
    });

    it("should send unmapped events as custom with original event_name", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.pintrk).toHaveBeenCalledWith(
        "track",
        "custom",
        expect.objectContaining({
          event_name: "refund",
          currency: "KRW",
          value: 5000,
          event_id: "test-event-id",
        }),
      );
    });
  });

  describe("track — event_id dedup", () => {
    it("should always include event_id for mapped events", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      const data = (window.pintrk as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(data.event_id).toBe("test-event-id");
    });

    it("should always include event_id for custom events", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("login", {}, mockContext);

      const data = (window.pintrk as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(data.event_id).toBe("test-event-id");
    });
  });

  describe("track — item transformation", () => {
    it("should not include line_items when items is empty", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("view_item_list", { items: [] }, mockContext);

      const data = (window.pintrk as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(data.line_items).toBeUndefined();
    });

    it("should default product_quantity to 1 and omit product_price when absent", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.track("add_to_cart", { items: [{ item_id: "B", item_name: "Item B" }] }, mockContext);

      const data = (window.pintrk as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(data.line_items[0]).toEqual({
        product_id: "B",
        product_name: "Item B",
        product_quantity: 1,
      });
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when pintrk is not available", () => {
      const plugin = createPinterestTagPlugin();

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
    it("should call pintrk set with hashed-match fields", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });

      expect(window.pintrk).toHaveBeenCalledWith("set", {
        em: "test@example.com",
        ph: "+821012345678",
      });
    });

    it("should map user_id to external_id", () => {
      mockPintrk();
      const plugin = createPinterestTagPlugin();

      plugin.setUser?.({ user_id: "user-123" });

      expect(window.pintrk).toHaveBeenCalledWith("set", { external_id: "user-123" });
    });

    it("should not throw in SSR", () => {
      const plugin = createPinterestTagPlugin();

      expect(() => plugin.setUser?.({ email: "test@example.com" })).not.toThrow();
    });
  });
});
