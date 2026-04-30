import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTikTokPixelPlugin } from "./index";

describe("createTikTokPixelPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  function mockTtq() {
    window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.ttq;
  });

  it("should have name 'tiktok-pixel'", () => {
    const plugin = createTikTokPixelPlugin();
    expect(plugin.name).toBe("tiktok-pixel");
  });

  describe("initialize", () => {
    it("should call ttq.load with pixelId", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.initialize({ pixelId: "ABCDE12345" });

      expect(window.ttq.load).toHaveBeenCalledWith("ABCDE12345");
    });

    it("should not call ttq.load when pixelId is absent", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.initialize({});

      expect(window.ttq.load).not.toHaveBeenCalled();
    });

    it("should not throw when ttq is not defined (SSR)", () => {
      const plugin = createTikTokPixelPlugin();

      expect(() => plugin.initialize({ pixelId: "ABCDE12345" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to ttq.page()", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.ttq.page).toHaveBeenCalledOnce();
      expect(window.ttq.track).not.toHaveBeenCalled();
    });

    it("should map purchase to CompletePayment with order_id and event_id", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        mockContext,
      );

      expect(window.ttq.track).toHaveBeenCalledWith(
        "CompletePayment",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          order_id: "T-1",
          event_id: "test-event-id",
          contents: [
            {
              content_id: "SKU1",
              content_name: "Shoes",
              content_type: "product",
              quantity: 2,
              price: 14500,
            },
          ],
        }),
      );
    });

    it("should map add_to_cart to AddToCart", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "AddToCart",
        expect.objectContaining({ currency: "USD", value: 50, event_id: "test-event-id" }),
      );
    });

    it("should map begin_checkout to InitiateCheckout", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("InitiateCheckout", expect.any(Object));
    });

    it("should map add_payment_info to AddPaymentInfo", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("add_payment_info", { currency: "USD", value: 100 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("AddPaymentInfo", expect.any(Object));
    });

    it("should map search to Search with query param", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("search", { search_term: "sneakers" }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "Search",
        expect.objectContaining({ query: "sneakers" }),
      );
    });

    it("should map sign_up to CompleteRegistration", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("CompleteRegistration", expect.any(Object));
    });

    it("should map generate_lead to SubmitForm", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("generate_lead", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("SubmitForm", expect.any(Object));
    });

    it("should pass through select_item as a custom event (no longer mapped to ClickButton)", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("select_item", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "select_item",
        expect.objectContaining({ event_id: "test-event-id" }),
      );
    });

    it("should send unmapped events as custom event via ttq.track", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "refund",
        expect.objectContaining({ currency: "KRW", value: 5000 }),
      );
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to contents and omit price when item.price is undefined", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3, price: 10 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        mockContext,
      );

      expect(window.ttq.track).toHaveBeenCalledWith(
        "ViewContent",
        expect.objectContaining({
          contents: [
            {
              content_id: "A",
              content_name: "Item A",
              content_type: "product",
              quantity: 3,
              price: 10,
            },
            {
              content_id: "B",
              content_name: "Item B",
              content_type: "product",
              quantity: 1,
            },
          ],
        }),
      );
    });

    it("should not include contents when items is empty", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.ttq.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.contents).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when ttq is not available", () => {
      const plugin = createTikTokPixelPlugin();

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
    it("should call ttq.identify with mapped properties", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });

      expect(window.ttq.identify).toHaveBeenCalledWith({
        email: "test@example.com",
        phone_number: "+821012345678",
      });
    });

    it("should map user_id to external_id", () => {
      mockTtq();
      const plugin = createTikTokPixelPlugin();

      plugin.setUser?.({ user_id: "user-123" });

      expect(window.ttq.identify).toHaveBeenCalledWith({ external_id: "user-123" });
    });

    it("should not throw in SSR", () => {
      const plugin = createTikTokPixelPlugin();

      expect(() => plugin.setUser?.({ email: "test@example.com" })).not.toThrow();
    });
  });
});
