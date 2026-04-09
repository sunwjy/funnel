import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTikTokPixelPlugin } from "./index";

describe("createTikTokPixelPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

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
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.initialize({ pixelId: "ABCDE12345" });

      expect(window.ttq.load).toHaveBeenCalledWith("ABCDE12345");
    });

    it("should not call ttq.load when pixelId is absent", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
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
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.ttq.page).toHaveBeenCalledOnce();
      expect(window.ttq.track).not.toHaveBeenCalled();
    });

    it("should map purchase to CompletePayment with params", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        mockContext,
      );

      expect(window.ttq.track).toHaveBeenCalledWith(
        "CompletePayment",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
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
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "AddToCart",
        expect.objectContaining({ currency: "USD", value: 50 }),
      );
    });

    it("should map begin_checkout to InitiateCheckout", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("InitiateCheckout", expect.any(Object));
    });

    it("should map add_payment_info to AddPaymentInfo", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("add_payment_info", { currency: "USD", value: 100 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("AddPaymentInfo", expect.any(Object));
    });

    it("should map search to Search with query param", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("search", { search_term: "sneakers" }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "Search",
        expect.objectContaining({ query: "sneakers" }),
      );
    });

    it("should map sign_up to CompleteRegistration", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("CompleteRegistration", expect.any(Object));
    });

    it("should map generate_lead to SubmitForm", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("generate_lead", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("SubmitForm", expect.any(Object));
    });

    it("should map select_item to ClickButton", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("select_item", {}, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith("ClickButton", expect.any(Object));
    });

    it("should send unmapped events as custom event via ttq.track", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
      const plugin = createTikTokPixelPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.ttq.track).toHaveBeenCalledWith(
        "refund",
        expect.objectContaining({ currency: "KRW", value: 5000 }),
      );
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to contents with content_id, content_name, content_type, quantity, price", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
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
              price: 0,
            },
          ],
        }),
      );
    });

    it("should not include contents when items is empty", () => {
      window.ttq = { load: vi.fn(), page: vi.fn(), track: vi.fn(), identify: vi.fn() };
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
        plugin.track("purchase", { currency: "KRW", value: 1000 }, mockContext),
      ).not.toThrow();
    });
  });
});
